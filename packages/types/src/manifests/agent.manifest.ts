import { z } from 'zod';
import { AiProvider } from '../enums';
import { manifestBase } from './common';

const identitySchema = z.union([
  z.object({ soul: z.string().min(1).max(5000) }),
  z.object({ soulRef: z.string().min(1) }),
]);

export const agentManifestSchema = manifestBase('Agent').extend({
  spec: z.object({
    displayName: z.string().min(1).max(100),
    title: z.string().min(1).max(100),
    specialization: z.string().min(1).max(200),
    identity: identitySchema,
    model: z.object({
      provider: z.nativeEnum(AiProvider).default(AiProvider.ZAI),
      name: z.string().default('glm-5'),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().positive().default(4096),
      apiKeyOverride: z.string().optional(),
      baseUrl: z.string().url().optional(),
    }).default({}),
    daemon: z.object({
      port: z.number().int().min(1024).max(65535).optional(),
      maxHistory: z.number().int().positive().default(50),
      maxToolRounds: z.number().int().positive().default(5),
    }).default({}),
    drives: z.object({
      personal: z.boolean().default(true),
      team: z.boolean().default(true),
    }).default({}),
  }),
});

export type AgentManifest = z.infer<typeof agentManifestSchema>;
