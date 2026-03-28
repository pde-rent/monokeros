import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Prune resource snapshots older than 7 days (runs daily at 3:00 AM UTC)
crons.daily(
  "prune resource snapshots",
  { hourUTC: 3, minuteUTC: 0 },
  internal.retention.pruneResourceSnapshots,
);

// Prune token usage events older than 90 days (runs weekly on Sundays at 4:00 AM UTC)
crons.weekly(
  "prune token usage",
  { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 },
  internal.retention.pruneTokenUsage,
);

export default crons;
