import { z } from "zod";
import { AiProvider, WorkspaceIndustry, TaskPriority } from "../enums";
import { DEFAULT_ENTITY_COLOR, taskTypeDefinitionSchema } from "../validation";
import { manifestBase } from "./common";

export const workspaceManifestSchema = manifestBase("Workspace").extend({
  spec: z.object({
    displayName: z.string().min(1).max(100),
    description: z.string().max(2000).default(""),
    industry: z.nativeEnum(WorkspaceIndustry),
    /** Cross-validated against INDUSTRY_SUBTYPES at the application layer. */
    industrySubtype: z.string().nullable().default(null),
    branding: z
      .object({
        logo: z.string().nullable().default(null),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default(DEFAULT_ENTITY_COLOR),
      })
      .default({}),
    encryption: z
      .object({
        atRest: z.boolean().default(true),
        inTransit: z.boolean().default(true),
      })
      .default({}),
    storage: z
      .object({
        maxDriveSizeMb: z.number().positive().default(500),
      })
      .default({}),
    defaults: z
      .object({
        phases: z.array(z.string().min(1)).default([]),
        taskTypes: z.array(taskTypeDefinitionSchema).default([]),
        taskPriority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
      })
      .default({}),
    providers: z
      .array(
        z.object({
          provider: z.nativeEnum(AiProvider),
          baseUrl: z.string().url(),
          apiKeyEnv: z.string().min(1),
          defaultModel: z.string().min(1),
          label: z.string().max(100).optional(),
        }),
      )
      .default([]),
    defaultProvider: z.nativeEnum(AiProvider).default(AiProvider.ZAI),
  }),
});

export type WorkspaceManifest = z.infer<typeof workspaceManifestSchema>;
