import { z } from "zod";
import { manifestBase, nameRegex } from "./common";

const unitSchema = z.object({
  name: z.string().regex(nameRegex),
  displayName: z.string().min(1).max(100),
  lead: z.string().regex(nameRegex).optional(),
  members: z.array(z.string().regex(nameRegex)).default([]),
});

export const orgManifestSchema = manifestBase("Org").extend({
  spec: z.object({
    directors: z.array(z.string().regex(nameRegex)).default([]),
    structure: z
      .object({
        departments: z.array(unitSchema).default([]),
        squads: z.array(unitSchema).default([]),
        taskforces: z.array(unitSchema).default([]),
      })
      .default({}),
    reporting: z.record(z.string().regex(nameRegex)).default({}),
  }),
});

export type OrgManifest = z.infer<typeof orgManifestSchema>;
