export { nameRegex, metadataSchema, manifestBase } from "./common";
export type { Metadata, ManifestBase } from "./common";

export { workspaceManifestSchema } from "./workspace.manifest";
export type { WorkspaceManifest } from "./workspace.manifest";

export { agentManifestSchema } from "./agent.manifest";
export type { AgentManifest } from "./agent.manifest";

export { teamManifestSchema } from "./team.manifest";
export type { TeamManifest } from "./team.manifest";

export { projectManifestSchema } from "./project.manifest";
export type { ProjectManifest } from "./project.manifest";

export { taskTemplateManifestSchema } from "./task-template.manifest";
export type { TaskTemplateManifest } from "./task-template.manifest";

export { driveManifestSchema } from "./drive.manifest";
export type { DriveManifest } from "./drive.manifest";

export { orgManifestSchema } from "./org.manifest";
export type { OrgManifest } from "./org.manifest";

import { workspaceManifestSchema } from "./workspace.manifest";
import { agentManifestSchema } from "./agent.manifest";
import { teamManifestSchema } from "./team.manifest";
import { projectManifestSchema } from "./project.manifest";
import { taskTemplateManifestSchema } from "./task-template.manifest";
import { driveManifestSchema } from "./drive.manifest";
import { orgManifestSchema } from "./org.manifest";

/** All manifest schemas keyed by kind — useful for JSON schema generation. */
export const manifests = {
  Workspace: workspaceManifestSchema,
  Agent: agentManifestSchema,
  Team: teamManifestSchema,
  Project: projectManifestSchema,
  TaskTemplate: taskTemplateManifestSchema,
  Drive: driveManifestSchema,
  Org: orgManifestSchema,
} as const;
