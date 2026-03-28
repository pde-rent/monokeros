import "./runtime"; // detect container runtime early
import { route } from "./router";
import { startStatsPolling } from "./docker";

const PORT = parseInt(process.env.PORT ?? "3002", 10);
const SECRET = process.env.CONTAINER_SERVICE_SECRET ?? "";

Bun.serve({
  port: PORT,
  idleTimeout: 255, // max — prevents Bun from killing long SSE streams
  async fetch(req) {
    // Auth check
    if (SECRET) {
      const auth = req.headers.get("Authorization");
      if (auth !== `Bearer ${SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    try {
      return await route(req);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[container-service] Error:", msg);
      return Response.json({ error: msg }, { status: 500 });
    }
  },
});

console.log(`[container-service] Listening on http://localhost:${PORT}`);

startStatsPolling();
