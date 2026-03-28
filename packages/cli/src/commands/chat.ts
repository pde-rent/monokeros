/**
 * mk chat — interactive chat session management.
 *
 * Subcommands:
 *   mk chat list                       List conversations
 *   mk chat view <conversationId>      View message history
 *   mk chat send <conversationId> <msg> Send a message
 *   mk chat start <agentId>            Start or resume a DM with an agent
 *
 * The "start" subcommand creates a conversation (or finds existing DM) and
 * enters an interactive REPL mode where you can type messages and see
 * streaming agent responses.
 */

import { Command } from "commander";
import pc from "picocolors";
import { getClient, containerServiceUrl } from "../client";
import { Formatter, type OutputFormat } from "../fmt/formatter";
import { CONVERSATION_COLUMNS } from "../fmt/columns";
import type { ChatMessage, DaemonEvent } from "@monokeros/types";

export function registerChatCommand(program: Command): void {
  const cmd = program
    .command("chat")
    .description("Chat session management");

  cmd
    .command("list")
    .description("List all conversations")
    .option("-o, --output <format>", "Output format: table, wide, json, yaml", "table")
    .action(async (opts: { output: string }) => {
      try {
        const client = getClient();
        const items = await client.listConversations();
        console.log(new Formatter(CONVERSATION_COLUMNS).format(items, opts.output as OutputFormat));
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("view <conversationId>")
    .description("View conversation message history")
    .option("-n, --tail <count>", "Show last N messages", "20")
    .option("-o, --output <format>", "Output format: text, json", "text")
    .action(async (conversationId: string, opts: { tail: string; output: string }) => {
      const client = getClient();
      try {
        const conv = await client.getConversation(conversationId);
        if (opts.output === "json") {
          console.log(JSON.stringify(conv, null, 2));
          return;
        }

        console.log(pc.bold(conv.title));
        console.log(pc.dim(`Type: ${conv.type} | Messages: ${conv.messageCount}`));
        console.log(pc.dim("─".repeat(60)));

        const tail = parseInt(opts.tail, 10);
        const messages = conv.messages.slice(-tail);

        for (const msg of messages) {
          printMessage(msg);
        }

        if (conv.messages.length > tail) {
          console.log(pc.dim(`\n... ${conv.messages.length - tail} earlier messages (use -n to see more)`));
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("send <conversationId> <message>")
    .description("Send a message to a conversation")
    .option("--stream", "Stream agent response (if agent is in conversation)")
    .action(async (conversationId: string, message: string, opts: { stream?: boolean }) => {
      const client = getClient();
      try {
        const result = await client.sendMessage(conversationId, message);
        printMessage(result);

        if (opts.stream) {
          // Stream agent response via container service NDJSON
          await streamResponse(conversationId, message);
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("start <agentId>")
    .description("Start or resume a DM with an agent (interactive mode)")
    .action(async (agentId: string) => {
      const client = getClient();
      try {
        // Create or find existing DM conversation
        const result = await client.createConversation({
          participantIds: [agentId],
        });

        const conv = result.conversation;
        console.log(
          result.created
            ? `New conversation with ${agentId}: ${conv.id}`
            : `Resumed conversation: ${conv.title} (${conv.id})`,
        );

        // Show recent history
        const full = await client.getConversation(conv.id);
        if (full.messages.length > 0) {
          console.log(pc.dim("─".repeat(60)));
          const recent = full.messages.slice(-5);
          for (const msg of recent) {
            printMessage(msg);
          }
          if (full.messages.length > 5) {
            console.log(pc.dim(`... ${full.messages.length - 5} earlier messages`));
          }
        }

        console.log(pc.dim("─".repeat(60)));
        console.log(pc.dim("Type a message and press Enter. Ctrl+C to exit."));

        // Interactive REPL
        const reader = Bun.stdin.stream().getReader();
        const decoder = new TextDecoder();
        process.stdout.write(pc.green("\n> "));

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const text = line.trim();
            if (!text) {
              process.stdout.write(pc.green("> "));
              continue;
            }
            if (text === "/quit" || text === "/exit") {
              return;
            }
            if (text === "/help") {
              console.log(pc.dim("Commands:"));
              console.log(pc.dim("  /history   Show last 10 messages"));
              console.log(pc.dim("  /quit      Exit the chat session"));
              console.log(pc.dim("  /help      Show this help"));
              process.stdout.write(pc.green("> "));
              continue;
            }
            if (text === "/history") {
              const updated = await client.getConversation(conv.id);
              for (const msg of updated.messages.slice(-10)) {
                printMessage(msg);
              }
              process.stdout.write(pc.green("\n> "));
              continue;
            }

            try {
              // Send message and stream response
              process.stdout.write(pc.dim("Sending...\r"));
              await client.sendMessage(conv.id, text);

              // Stream the agent response
              await streamResponse(conv.id, text);
            } catch (err) {
              console.error(pc.red(err instanceof Error ? err.message : String(err)));
            }

            process.stdout.write(pc.green("\n> "));
          }
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}

function printMessage(msg: ChatMessage): void {
  const time = pc.dim(new Date(msg.timestamp).toLocaleTimeString());
  let role: string;
  switch (msg.role) {
    case "agent":
      role = pc.cyan("agent");
      break;
    case "user":
      role = pc.green("you");
      break;
    case "system":
      role = pc.yellow("system");
      break;
    case "thinking":
      role = pc.dim("thinking");
      break;
    default:
      role = msg.role;
  }

  console.log(`${time} ${role}: ${msg.content}`);
}

/**
 * Stream NDJSON response from the container service.
 * Events: status, tool_start, tool_end, content, done, error
 */
async function streamResponse(conversationId: string, message: string): Promise<void> {
  const baseUrl = containerServiceUrl();
  const url = `${baseUrl}/stream/${conversationId}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok || !res.body) {
      console.error(pc.red(`Stream error: ${res.status}`));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let hasContent = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as DaemonEvent;
          switch (event.type) {
            case "status":
              process.stdout.write(pc.dim(`[${event.data.phase}] `));
              break;
            case "tool_start":
              process.stdout.write(pc.yellow(`\n[tool: ${event.data.name}] `));
              break;
            case "tool_end":
              process.stdout.write(pc.dim(`(${event.data.durationMs}ms)\n`));
              break;
            case "content":
              if (!hasContent) {
                process.stdout.write(`\n${pc.cyan("agent")}: `);
                hasContent = true;
              }
              process.stdout.write(event.data.delta);
              break;
            case "done":
              if (hasContent) process.stdout.write("\n");
              break;
            case "error":
              console.error(pc.red(`\nError: ${event.data.message}`));
              break;
          }
        } catch {
          // Skip malformed NDJSON lines
        }
      }
    }
  } catch (err) {
    console.error(pc.dim(`Stream unavailable: ${err instanceof Error ? err.message : String(err)}`));
  }
}
