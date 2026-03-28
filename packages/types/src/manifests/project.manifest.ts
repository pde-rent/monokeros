import { z } from "zod";
import { TaskPriority } from "../enums";
import { DEFAULT_ENTITY_COLOR } from "../validation";
import { manifestBase, nameRegex } from "./common";

export const projectManifestSchema = manifestBase("Project").extend({
  spec: z.object({
    displayName: z.string().min(1).max(100),
    description: z.string().max(2000).default(""),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default(DEFAULT_ENTITY_COLOR),
    types: z.array(z.string().min(1)).min(1),
    assignments: z
      .object({
        teams: z.array(z.string().regex(nameRegex)).default([]),
        members: z.array(z.string().regex(nameRegex)).default([]),
      })
      .default({}),
    phases: z.array(z.string().min(1)).min(1),
    gateApprovers: z.record(z.string().regex(nameRegex)).default({}),
    drive: z
      .object({
        enabled: z.boolean().default(true),
        maxSizeMb: z.number().positive().default(200),
      })
      .default({}),
    chat: z
      .object({
        autoCreate: z.boolean().default(true),
      })
      .default({}),
    defaults: z
      .object({
        priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
      })
      .default({}),
    gitRepo: z
      .object({
        url: z.string().min(1),
        defaultBranch: z.string().min(1).default("main"),
        provider: z.string().nullable().default(null),
      })
      .optional(),
    definitionOfDone: z
      .array(
        z.object({
          description: z.string().min(1).max(1000),
          required: z.boolean().default(true),
        }),
      )
      .default([]),
  }),
});

export type ProjectManifest = z.infer<typeof projectManifestSchema>;
