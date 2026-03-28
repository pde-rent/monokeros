import { action, query } from "./_generated/server";
import { v } from "convex/values";

/** Static provider registry. */
export const providers = query({
  handler: async () => {
    return [
      { id: "zai", name: "Z.ai", defaultBaseUrl: "https://api.z.ai/api/coding/paas/v4" },
      { id: "openai", name: "OpenAI", defaultBaseUrl: "https://api.openai.com/v1" },
      { id: "anthropic", name: "Anthropic", defaultBaseUrl: "https://api.anthropic.com/v1" },
      {
        id: "google",
        name: "Google",
        defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      },
      { id: "deepseek", name: "DeepSeek", defaultBaseUrl: "https://api.deepseek.com/v1" },
      { id: "xai", name: "xAI", defaultBaseUrl: "https://api.x.ai/v1" },
      { id: "mistral", name: "Mistral", defaultBaseUrl: "https://api.mistral.ai/v1" },
      { id: "openrouter", name: "OpenRouter", defaultBaseUrl: "https://openrouter.ai/api/v1" },
      { id: "ollama", name: "Ollama", defaultBaseUrl: "http://localhost:11434/v1" },
      { id: "groq", name: "Groq", defaultBaseUrl: "https://api.groq.com/openai/v1" },
      { id: "together", name: "Together AI", defaultBaseUrl: "https://api.together.xyz/v1" },
      {
        id: "fireworks",
        name: "Fireworks",
        defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
      },
      { id: "perplexity", name: "Perplexity", defaultBaseUrl: "https://api.perplexity.ai" },
      { id: "cohere", name: "Cohere", defaultBaseUrl: "https://api.cohere.ai/v1" },
      { id: "custom", name: "Custom (OpenAI-compatible)", defaultBaseUrl: "" },
    ];
  },
});

/** Fetch model catalog from OpenRouter. */
export const catalog = action({
  args: { search: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "HTTP-Referer": "https://monokeros.sh" },
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const data = await res.json();
    let models = (data.data ?? []).map((m: any) => ({
      id: m.id,
      name: m.name,
      providerSlug: m.id.split("/")[0],
      contextLength: m.context_length ?? 0,
      maxCompletionTokens: m.top_provider?.max_completion_tokens ?? 0,
      supportsVision: m.architecture?.modality?.includes("image") ?? false,
      supportsAudio: m.architecture?.modality?.includes("audio") ?? false,
      supportsTools: true,
      pricing: {
        prompt: m.pricing?.prompt ?? "0",
        completion: m.pricing?.completion ?? "0",
      },
    }));

    if (args.search) {
      const q = args.search.toLowerCase();
      models = models.filter(
        (m: any) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
      );
    }

    return {
      models: models.slice(0, 100),
      providerSlugs: [...new Set(models.map((m: any) => m.providerSlug))],
      fetchedAt: new Date().toISOString(),
    };
  },
});
