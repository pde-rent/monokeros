import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;

/** Prune resourceSnapshots older than 7 days. */
export const pruneResourceSnapshots = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - SEVEN_DAYS_MS;
    const old = await ctx.db
      .query("resourceSnapshots")
      .order("asc")
      .take(BATCH_SIZE);

    let deleted = 0;
    for (const snap of old) {
      if (snap._creationTime < cutoff) {
        await ctx.db.delete(snap._id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`[retention] Pruned ${deleted} resource snapshots`);
    }

    // If we hit the batch limit, schedule another run immediately
    if (deleted === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.retention.pruneResourceSnapshots);
    }
  },
});

/** Prune tokenUsage older than 90 days. */
export const pruneTokenUsage = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - NINETY_DAYS_MS;
    const old = await ctx.db
      .query("tokenUsage")
      .order("asc")
      .take(BATCH_SIZE);

    let deleted = 0;
    for (const event of old) {
      if (event._creationTime < cutoff) {
        await ctx.db.delete(event._id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`[retention] Pruned ${deleted} token usage events`);
    }

    // If we hit the batch limit, schedule another run immediately
    if (deleted === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.retention.pruneTokenUsage);
    }
  },
});
