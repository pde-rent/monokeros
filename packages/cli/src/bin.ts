#!/usr/bin/env bun
/**
 * mk — MonokerOS CLI
 *
 * kubectl-inspired interface to manage workspaces, agents, teams, projects,
 * tasks, conversations, and files. Consistent with the MCP tool naming
 * (noun.action) and API dispatch actions.
 *
 * Grammar: mk <command|resource> <action> [target] [flags]
 *
 * Examples:
 *   mk get agents                    List all agents
 *   mk get tasks --project <id>      List tasks filtered by project
 *   mk describe member <id>          Detailed view of a member
 *   mk create task --title "Fix"     Create a task
 *   mk apply -f agent.yaml           Apply a manifest
 *   mk chat start <agentId>          Interactive chat with an agent
 *   mk agents top                    Resource monitoring
 *   mk files tree member <id>        File tree for an agent's drive
 *   mk config use-context prod       Switch context
 */

import { Command } from "commander";
import { registerGetCommand } from "./commands/get";
import { registerDescribeCommand } from "./commands/describe";
import { registerCreateCommand } from "./commands/create";
import { registerDeleteCommand } from "./commands/delete";
import { registerApplyCommand } from "./commands/apply";
import { registerChatCommand } from "./commands/chat";
import { registerAgentsCommand } from "./commands/agents";
import { registerFilesCommand } from "./commands/files";
import { registerConfigCommand } from "./commands/config";
import { registerApiResourcesCommand } from "./commands/api-resources";

const program = new Command();

program
  .name("mk")
  .description("MonokerOS CLI — manage AI agent workspaces")
  .version("0.0.1");

// Register all commands
registerGetCommand(program);
registerDescribeCommand(program);
registerCreateCommand(program);
registerDeleteCommand(program);
registerApplyCommand(program);
registerChatCommand(program);
registerAgentsCommand(program);
registerFilesCommand(program);
registerConfigCommand(program);
registerApiResourcesCommand(program);

program.parse();
