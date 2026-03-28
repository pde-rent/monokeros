import { z } from "zod";
import { manifestBase } from "./common";
import { DriveType, DriveAccessLevel } from "../enums";

export const driveManifestSchema = manifestBase("Drive").extend({
  spec: z.object({
    type: z.nativeEnum(DriveType),
    displayName: z.string().min(1).max(100),
    capacity: z
      .object({
        maxSizeMb: z.number().positive().default(500),
      })
      .default({}),
    protectedPaths: z.array(z.string()).default([]),
    acl: z
      .array(
        z.object({
          principal: z.string().min(1),
          access: z.nativeEnum(DriveAccessLevel),
        }),
      )
      .default([]),
  }),
});

export type DriveManifest = z.infer<typeof driveManifestSchema>;
