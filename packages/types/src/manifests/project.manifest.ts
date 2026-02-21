import { z } from 'zod';
import { TaskPriority } from '../enums';
import { DEFAULT_ENTITY_COLOR } from '../validation';
import { manifestBase, nameRegex } from './common';

export const projectManifestSchema = manifestBase('Project').extend({
  spec: z.object({
    displayName: z.string().min(1).max(100),
    description: z.string().max(2000).default(''),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default(DEFAULT_ENTITY_COLOR),
    types: z.array(z.string().min(1)).min(1),
    assignments: z.object({
      teams: z.array(z.string().regex(nameRegex)).default([]),
      members: z.array(z.string().regex(nameRegex)).default([]),
    }).default({}),
    phases: z.array(z.string().min(1)).min(1),
    gateApprovers: z.record(z.string().regex(nameRegex)).default({}),
    drive: z.object({
      enabled: z.boolean().default(true),
      maxSizeMb: z.number().positive().default(200),
    }).default({}),
    chat: z.object({
      autoCreate: z.boolean().default(true),
    }).default({}),
    defaults: z.object({
      priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
    }).default({}),
  }),
});

export type ProjectManifest = z.infer<typeof projectManifestSchema>;
