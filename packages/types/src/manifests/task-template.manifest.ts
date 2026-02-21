import { z } from 'zod';
import { TaskPriority } from '../enums';
import { manifestBase, nameRegex } from './common';

export const taskTemplateManifestSchema = manifestBase('TaskTemplate').extend({
  spec: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).default(''),
    defaultTeam: z.string().regex(nameRegex).optional(),
    defaultPhase: z.string().min(1).optional(),
    defaultType: z.string().min(1).optional(),
    defaultPriority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
    crossValidation: z.object({
      enabled: z.boolean().default(false),
      minReviewers: z.number().int().min(1).max(5).default(2),
    }).default({}),
    acceptanceCriteria: z.array(z.string().min(1).max(1000)).default([]),
  }),
});

export type TaskTemplateManifest = z.infer<typeof taskTemplateManifestSchema>;
