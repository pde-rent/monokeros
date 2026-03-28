import { z } from "zod";
import { manifestBase, nameRegex } from "./common";

export const teamManifestSchema = manifestBase("Team").extend({
  spec: z.object({
    displayName: z.string().min(1).max(100),
    type: z.string().min(1),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    lead: z.string().regex(nameRegex).describe("Agent name reference"),
    members: z.array(z.string().regex(nameRegex)).default([]),
    drive: z
      .object({
        enabled: z.boolean().default(true),
        maxSizeMb: z.number().positive().default(200),
      })
      .default({}),
  }),
});

export type TeamManifest = z.infer<typeof teamManifestSchema>;
