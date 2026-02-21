import { z } from 'zod';

/** Kubernetes-style lowercase kebab-case name */
export const nameRegex = /^[a-z][a-z0-9-]*$/;

export const metadataSchema = z.object({
  name: z.string().regex(nameRegex, 'Must be lowercase kebab-case'),
  namespace: z.string().optional(),
  labels: z.record(z.string()).default({}),
  annotations: z.record(z.string()).default({}),
});

export type Metadata = z.infer<typeof metadataSchema>;

/** Factory: creates a base manifest schema with a fixed `kind` literal. */
export function manifestBase<K extends string>(kind: K) {
  return z.object({
    apiVersion: z.literal('v1').default('v1'),
    kind: z.literal(kind),
    metadata: metadataSchema,
  });
}

export type ManifestBase = z.infer<ReturnType<typeof manifestBase>>;
