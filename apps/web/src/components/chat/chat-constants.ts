/** Human-friendly labels for daemon-reported tool names */
export const TOOL_LABELS: Record<string, string> = {
  web_search: "Searching the web",
  web_read: "Reading a page",
  file_read: "Reading a file",
  file_write: "Writing a file",
  list_drives: "Browsing drives",
  knowledge_search: "Searching knowledge",
  create_team: "Creating team",
  create_member: "Creating member",
  update_team: "Updating team",
  create_project: "Creating project",
  update_workspace: "Updating workspace",
  create_task: "Creating task",
  assign_task: "Assigning task",
  move_task: "Moving task",
  update_task: "Updating task",
  list_tasks: "Listing tasks",
  list_members: "Listing members",
  list_teams: "Listing teams",
  list_projects: "Listing projects",
  update_project: "Updating project",
  update_gate: "Updating gate",
  delegate_to_keros: "Delegating to Keros",
};

/** Phase labels for daemon-reported thinking phases */
export const PHASE_LABELS: Record<string, string> = {
  thinking: "Thinking",
  reflecting: "Reflecting",
};

/** Mention trigger → type mapping */
export const MENTION_TYPE_MAP: Record<string, { type: string; className: string }> = {
  "@": { type: "agent", className: "text-blue" },
  "#": { type: "project", className: "text-green" },
  "~": { type: "task", className: "text-orange" },
  ":": { type: "file", className: "text-purple" },
};
