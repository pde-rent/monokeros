import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { join, resolve, basename, dirname } from 'node:path';
import { readdir, stat, readFile, writeFile, rename, rm, mkdir } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import type {
  MemberDrive,
  TeamDrive,
  ProjectDrive,
  WorkspaceDrive,
  DriveListing,
  FileEntry,
  CreateFileRequest,
  CreateFolderRequest,
  RenameRequest,
  UpdateFileRequest,
  MemberGender,
} from '@monokeros/types';
import { FileEntryType } from '@monokeros/types';
import { mimeFromExt } from '@monokeros/utils';
import { SYSTEM_FILES, PROTECTED_DIRECTORIES, KNOWLEDGE_DIR } from '@monokeros/constants';
import { generateAvatar, saveAvatarFiles } from '@monokeros/avatar';
import { MockStore } from '../store/mock-store';
import { getDataDir, getTeamDataDir, getProjectDataDir, getWorkspaceDataDir } from '../common/data-dir';

/** Create a deterministic ID from a path */
function pathId(ownerId: string, filePath: string): string {
  return `${ownerId}:${filePath}`.replace(/[^a-zA-Z0-9:/_.-]/g, '_');
}

type DriveCategory = 'teams' | 'members' | 'projects' | 'workspace';

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly memberDataDir = getDataDir();
  private readonly teamDataDir = getTeamDataDir();
  private readonly projectDataDir = getProjectDataDir();
  private readonly workspaceDataDir = getWorkspaceDataDir();

  constructor(private store: MockStore) {
    // Ensure data directories exist
    mkdirSync(this.projectDataDir, { recursive: true });
    mkdirSync(this.workspaceDataDir, { recursive: true });
    mkdirSync(join(this.workspaceDataDir, KNOWLEDGE_DIR), { recursive: true });
  }

  async onModuleInit() {
    // Provision project drive directories for all existing projects
    for (const project of this.store.projects.values()) {
      this.ensureProjectDrive(project.id);
    }

    // Ensure KNOWLEDGE dirs for all team drives
    for (const team of this.store.teams.values()) {
      this.ensureTeamDrive(team.id);
    }

    // Ensure KNOWLEDGE dirs and generate avatars for all agent personal drives
    const avatarJobs: Promise<void>[] = [];
    for (const member of this.store.members.values()) {
      if (member.type === 'agent') {
        this.ensureMemberDrive(member.id);
        const teamColor = member.teamId ? this.store.teams.get(member.teamId)?.color : undefined;
        avatarJobs.push(
          this.generateAndSaveAvatar(member.id, teamColor, member.gender).then((dataUri) => {
            if (!member.avatarUrl) member.avatarUrl = dataUri;
          }),
        );
      }
    }
    await Promise.all(avatarJobs);

    // Seed MONOKEROS.md into workspace KNOWLEDGE if not exists
    await this.seedMonokerosDoc();
  }

  private async seedMonokerosDoc() {
    const docPath = join(this.workspaceDataDir, KNOWLEDGE_DIR, 'MONOKEROS.md');
    if (existsSync(docPath)) return;

    const content = `# MonokerOS — System Documentation

> This file is auto-generated and protected. It serves as the workspace's canonical reference.

## Workspace Structure

MonokerOS organizes work through **teams**, **members**, **projects**, and **tasks**.

### Teams
Teams are functional groups (e.g., Product Management, Development, QA). Each team has:
- A **lead** agent responsible for coordination and cross-validation
- **Member** agents with specialized skills
- A shared **team drive** for files and deliverables

### Members
Members are either **agents** (AI) or **humans** (supervisors). Agents run as daemons with tool access (web search, file read/write, drives). Human supervisors oversee teams and approve gates.

### Projects
Projects track multi-phase work with SDLC gates. Each project has:
- Assigned teams and members
- Phases with gate approvals
- A project drive for artifacts
- An optional project chat channel

### Tasks
Tasks belong to projects, assigned to team members. They support:
- Cross-validation (multiple agents independently solve, then compare)
- Priority levels and dependencies
- Phase tracking aligned with project gates

## Drive System

Four drive types with scoped access:

| Drive | Path | Agent Access |
|-------|------|-------------|
| Member (personal) | \`/members/{id}/\` | Read/Write (own) |
| Team (shared) | \`/teams/{id}/\` | Read/Write (own team) |
| Project | \`/projects/{id}/\` | Read/Write (assigned) |
| Workspace | \`/workspace/\` | Read-only |

Other teams' drives are read-only. Each drive contains a \`KNOWLEDGE/\` directory for structured documentation.

## Knowledge System

Every drive scope has a \`KNOWLEDGE/\` directory for curated reference material. Agents can search across all accessible knowledge using the \`knowledge_search\` tool, which performs lexical search with relevance scoring.

**Conventions:**
- Use clear, descriptive filenames (e.g., \`api-conventions.md\`, \`deployment-guide.md\`)
- Keep files focused on a single topic
- Use markdown with headings for structure (headings are weighted in search)
- Place team-specific knowledge in the team drive, cross-cutting knowledge in workspace

## Communication

- **Agent DMs**: 1:1 conversations with individual agents
- **Project chats**: Multi-agent channels tied to a project
- **Group chats**: Ad-hoc multi-agent conversations
- Agents use @mentions, #project references, and ~task references

## Agent Architecture

Agents run as ZeroClaw daemons with:
- System prompt built from SOUL.md + FOUNDATION.md + AGENTS.md + SKILLS.md
- Tool calling (web search, web read, file read/write, list drives, knowledge search)
- Conversation history with bounded context window
- Health checks and graceful lifecycle management
`;
    await writeFile(docPath, content, 'utf-8');
  }

  /** Validate a path component to prevent directory traversal */
  private validatePath(base: string, requested: string): string {
    const resolved = resolve(base, requested);
    if (!resolved.startsWith(base + '/') && resolved !== base) {
      throw new BadRequestException('Invalid path');
    }
    return resolved;
  }

  /** Recursively scan a directory into FileEntry[] */
  private async scanDir(dirPath: string, ownerId: string, relativeTo: string): Promise<FileEntry[]> {
    if (!existsSync(dirPath)) return [];

    const raw = await readdir(dirPath, { withFileTypes: true });
    const entries = raw
      .filter((e) => !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    return Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dirPath, entry.name);
        const relPath = '/' + fullPath.slice(relativeTo.length + 1);
        const st = await stat(fullPath);

        if (entry.isDirectory()) {
          return {
            id: pathId(ownerId, relPath),
            name: entry.name,
            path: relPath,
            type: FileEntryType.DIRECTORY,
            size: 0,
            mimeType: 'inode/directory',
            modifiedAt: st.mtime.toISOString(),
            children: await this.scanDir(fullPath, ownerId, relativeTo),
          };
        }

        return {
          id: pathId(ownerId, relPath),
          name: entry.name,
          path: relPath,
          type: FileEntryType.FILE,
          size: st.size,
          mimeType: mimeFromExt(entry.name),
          modifiedAt: st.mtime.toISOString(),
        };
      }),
    );
  }

  // ── Member Workspaces ─────────────────────────────────────

  /** Build a MemberDrive for a single member */
  private async buildMemberDrive(memberId: string): Promise<MemberDrive | null> {
    const dir = join(this.memberDataDir, memberId);
    if (!existsSync(dir)) return null;

    const member = this.store.members.get(memberId);
    return {
      memberId,
      memberName: member?.name ?? memberId,
      rootPath: dir,
      files: await this.scanDir(dir, memberId, dir),
    };
  }

  /** Get sorted list of member directory names on disk */
  private async getDirIds(root: string): Promise<string[]> {
    if (!existsSync(root)) return [];
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  }

  async listMemberDrives(): Promise<MemberDrive[]> {
    const ids = await this.getDirIds(this.memberDataDir);
    const results = await Promise.all(ids.map((id) => this.buildMemberDrive(id)));
    return results.filter((d): d is MemberDrive => d !== null);
  }

  async getMemberDrive(memberId: string): Promise<MemberDrive> {
    const d = await this.buildMemberDrive(memberId);
    if (!d) throw new NotFoundException(`Member drive not found: ${memberId}`);
    return d;
  }

  async readMemberFile(memberId: string, path: string): Promise<FileEntry & { content: string }> {
    const base = join(this.memberDataDir, memberId);
    return this.readFileFrom(base, memberId, path);
  }

  // ── Team Workspaces ──────────────────────────────────────

  /** Build a TeamDrive for a single team */
  private async buildTeamDrive(teamId: string): Promise<TeamDrive | null> {
    const dir = join(this.teamDataDir, teamId);
    if (!existsSync(dir)) return null;

    const team = this.store.teams.get(teamId);
    return {
      id: teamId,
      name: team?.name ?? teamId,
      teamId,
      rootPath: dir,
      files: await this.scanDir(dir, teamId, dir),
    };
  }

  async listTeamDrives(): Promise<TeamDrive[]> {
    const ids = await this.getDirIds(this.teamDataDir);
    const results = await Promise.all(ids.map((id) => this.buildTeamDrive(id)));
    return results.filter((d): d is TeamDrive => d !== null);
  }

  async getTeamDrive(teamId: string): Promise<TeamDrive> {
    const d = await this.buildTeamDrive(teamId);
    if (!d) throw new NotFoundException(`Team drive not found: ${teamId}`);
    return d;
  }

  async readTeamFile(teamId: string, path: string): Promise<FileEntry & { content: string }> {
    const base = join(this.teamDataDir, teamId);
    return this.readFileFrom(base, teamId, path);
  }

  // ── Project Drives ──────────────────────────────────────

  private async buildProjectDrive(projectId: string): Promise<ProjectDrive | null> {
    const dir = join(this.projectDataDir, projectId);
    if (!existsSync(dir)) return null;

    const project = this.store.projects.get(projectId);
    return {
      id: projectId,
      name: project?.name ?? projectId,
      projectId,
      rootPath: dir,
      files: await this.scanDir(dir, projectId, dir),
    };
  }

  async ensureProjectDrive(projectId: string): Promise<void> {
    const dir = join(this.projectDataDir, projectId);
    await mkdir(dir, { recursive: true });
    await mkdir(join(dir, KNOWLEDGE_DIR), { recursive: true });
  }

  ensureTeamDrive(teamId: string): void {
    const dir = join(this.teamDataDir, teamId);
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, KNOWLEDGE_DIR), { recursive: true });
  }

  ensureMemberDrive(memberId: string): void {
    const dir = join(this.memberDataDir, memberId);
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, KNOWLEDGE_DIR), { recursive: true });
  }

  /**
   * Generate a deterministic avatar for a member and save SVG + PNG to their drive.
   * Returns the data-URI for use as avatarUrl. Skips if avatar.svg already exists.
   */
  async generateAndSaveAvatar(memberId: string, backgroundColor?: string, gender?: MemberGender): Promise<string> {
    const dir = join(this.memberDataDir, memberId);
    const svgPath = join(dir, 'avatar.svg');
    if (existsSync(svgPath)) {
      // Already generated — return data URI without re-saving
      return generateAvatar({ seed: memberId, backgroundColor, gender });
    }
    const dataUri = generateAvatar({ seed: memberId, backgroundColor, gender });
    await saveAvatarFiles(dataUri, dir);
    return dataUri;
  }

  async listProjectDrives(): Promise<ProjectDrive[]> {
    const ids = await this.getDirIds(this.projectDataDir);
    const results = await Promise.all(ids.map((id) => this.buildProjectDrive(id)));
    return results.filter((d): d is ProjectDrive => d !== null);
  }

  async getProjectDrive(projectId: string): Promise<ProjectDrive> {
    const d = await this.buildProjectDrive(projectId);
    if (!d) throw new NotFoundException(`Project drive not found: ${projectId}`);
    return d;
  }

  async readProjectFile(projectId: string, path: string): Promise<FileEntry & { content: string }> {
    const base = join(this.projectDataDir, projectId);
    return this.readFileFrom(base, projectId, path);
  }

  // ── Workspace Shared Drive ──────────────────────────────

  async getWorkspaceDrive(): Promise<WorkspaceDrive | null> {
    if (!existsSync(this.workspaceDataDir)) return null;
    return {
      id: 'workspace',
      name: 'Workspace',
      rootPath: this.workspaceDataDir,
      files: await this.scanDir(this.workspaceDataDir, 'workspace', this.workspaceDataDir),
    };
  }

  async readWorkspaceFile(path: string): Promise<FileEntry & { content: string }> {
    return this.readFileFrom(this.workspaceDataDir, 'workspace', path);
  }

  // ── Combined Listing ──────────────────────────────────────

  async listAllDrives(): Promise<DriveListing> {
    const [teamDrives, memberDrives, projectDrives, workspaceDrive] = await Promise.all([
      this.listTeamDrives(),
      this.listMemberDrives(),
      this.listProjectDrives(),
      this.getWorkspaceDrive(),
    ]);
    return { teamDrives, memberDrives, projectDrives, workspaceDrive };
  }

  // ── CRUD Operations ──────────────────────────────────────

  async createFile(
    category: DriveCategory,
    ownerId: string,
    dir: string,
    body: CreateFileRequest,
  ): Promise<FileEntry> {
    const base = this.getBaseDir(category, ownerId);
    const ext = body.extension ? `.${body.extension}` : '';
    const fileName = body.name + ext;
    const targetDir = this.validatePath(base, dir.startsWith('/') ? dir.slice(1) : dir || '.');

    if (!existsSync(targetDir)) {
      throw new NotFoundException(`Directory not found: ${dir}`);
    }

    // Prevent creating files with system file names
    if (SYSTEM_FILES.has(fileName)) {
      throw new BadRequestException(`Cannot create file with reserved system name: ${fileName}`);
    }

    const fullPath = join(targetDir, fileName);
    if (existsSync(fullPath)) {
      throw new BadRequestException(`File already exists: ${fileName}`);
    }

    await writeFile(fullPath, body.content ?? '', 'utf-8');
    const st = await stat(fullPath);
    const relPath = '/' + fullPath.slice(base.length + 1);

    return {
      id: pathId(ownerId, relPath),
      name: fileName,
      path: relPath,
      type: FileEntryType.FILE,
      size: st.size,
      mimeType: mimeFromExt(fileName),
      modifiedAt: st.mtime.toISOString(),
    };
  }

  async createFolder(
    category: DriveCategory,
    ownerId: string,
    dir: string,
    body: CreateFolderRequest,
  ): Promise<FileEntry> {
    const base = this.getBaseDir(category, ownerId);
    const targetDir = this.validatePath(base, dir.startsWith('/') ? dir.slice(1) : dir || '.');

    if (!existsSync(targetDir)) {
      throw new NotFoundException(`Directory not found: ${dir}`);
    }

    // Prevent creating folders with protected directory names
    if (PROTECTED_DIRECTORIES.has(body.name)) {
      throw new BadRequestException(`Cannot create folder with reserved system name: ${body.name}`);
    }

    const fullPath = join(targetDir, body.name);
    if (existsSync(fullPath)) {
      throw new BadRequestException(`Folder already exists: ${body.name}`);
    }

    await mkdir(fullPath, { recursive: true });
    const st = await stat(fullPath);
    const relPath = '/' + fullPath.slice(base.length + 1);

    return {
      id: pathId(ownerId, relPath),
      name: body.name,
      path: relPath,
      type: FileEntryType.DIRECTORY,
      size: 0,
      mimeType: 'inode/directory',
      modifiedAt: st.mtime.toISOString(),
      children: [],
    };
  }

  async renameItem(
    category: DriveCategory,
    ownerId: string,
    path: string,
    body: RenameRequest,
  ): Promise<FileEntry> {
    const base = this.getBaseDir(category, ownerId);
    const fullPath = this.validatePath(base, path.startsWith('/') ? path.slice(1) : path);

    if (!existsSync(fullPath)) {
      throw new NotFoundException(`Item not found: ${path}`);
    }

    const currentName = basename(fullPath);
    if (SYSTEM_FILES.has(currentName)) {
      throw new BadRequestException(`Cannot rename system file: ${currentName}`);
    }
    if (PROTECTED_DIRECTORIES.has(currentName)) {
      throw new BadRequestException(`Cannot rename protected directory: ${currentName}`);
    }

    const parentDir = dirname(fullPath);
    if (parentDir === base && fullPath === base) {
      throw new BadRequestException('Cannot rename workspace root');
    }

    const newFullPath = join(dirname(fullPath), body.newName);
    if (existsSync(newFullPath)) {
      throw new BadRequestException(`Item already exists: ${body.newName}`);
    }

    await rename(fullPath, newFullPath);
    const st = await stat(newFullPath);
    const relPath = '/' + newFullPath.slice(base.length + 1);
    const isDir = st.isDirectory();

    return {
      id: pathId(ownerId, relPath),
      name: body.newName,
      path: relPath,
      type: isDir ? FileEntryType.DIRECTORY : FileEntryType.FILE,
      size: isDir ? 0 : st.size,
      mimeType: isDir ? 'inode/directory' : mimeFromExt(body.newName),
      modifiedAt: st.mtime.toISOString(),
    };
  }

  async updateFileContent(
    category: DriveCategory,
    ownerId: string,
    path: string,
    body: UpdateFileRequest,
    options?: { isAdmin?: boolean },
  ): Promise<FileEntry & { content: string }> {
    const base = this.getBaseDir(category, ownerId);
    const fullPath = this.validatePath(base, path.startsWith('/') ? path.slice(1) : path);

    if (!existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${path}`);
    }

    const st = await stat(fullPath);
    if (st.isDirectory()) {
      throw new BadRequestException('Cannot write content to a directory');
    }

    // System files can only be edited by admin users, never renamed or deleted
    const fileName = basename(fullPath);
    if (SYSTEM_FILES.has(fileName)) {
      if (!options?.isAdmin) {
        throw new ForbiddenException(`System file '${fileName}' can only be edited by admin users`);
      }
    }

    await writeFile(fullPath, body.content, 'utf-8');
    const newSt = await stat(fullPath);
    const name = basename(fullPath);
    const relPath = '/' + fullPath.slice(base.length + 1);

    return {
      id: pathId(ownerId, relPath),
      name,
      path: relPath,
      type: FileEntryType.FILE,
      size: newSt.size,
      mimeType: mimeFromExt(name),
      modifiedAt: newSt.mtime.toISOString(),
      content: body.content,
    };
  }

  async deleteItem(
    category: DriveCategory,
    ownerId: string,
    path: string,
  ): Promise<{ success: boolean }> {
    const base = this.getBaseDir(category, ownerId);
    const fullPath = this.validatePath(base, path.startsWith('/') ? path.slice(1) : path);

    if (!existsSync(fullPath)) {
      throw new NotFoundException(`Item not found: ${path}`);
    }

    const name = basename(fullPath);
    if (SYSTEM_FILES.has(name)) {
      throw new BadRequestException(`Cannot delete system file: ${name}`);
    }
    if (PROTECTED_DIRECTORIES.has(name)) {
      throw new BadRequestException(`Cannot delete protected directory: ${name}`);
    }

    const parentDir = dirname(fullPath);
    if (parentDir === base) {
      const st = await stat(fullPath);
      if (st.isDirectory()) {
        throw new BadRequestException('Cannot delete root-level workspace directory');
      }
    }

    const st = await stat(fullPath);
    await rm(fullPath, { recursive: st.isDirectory() });

    return { success: true };
  }

  // ── Helpers ──────────────────────────────────────────────

  private getBaseDir(category: DriveCategory, ownerId: string): string {
    let rootDir: string;
    switch (category) {
      case 'teams':
        rootDir = this.teamDataDir;
        break;
      case 'members':
        rootDir = this.memberDataDir;
        break;
      case 'projects':
        rootDir = this.projectDataDir;
        break;
      case 'workspace':
        return this.workspaceDataDir;
      default:
        throw new BadRequestException(`Invalid drive category: ${category}`);
    }
    const base = join(rootDir, ownerId);
    if (!existsSync(base)) {
      throw new NotFoundException(`Workspace not found: ${category}/${ownerId}`);
    }
    return base;
  }

  private async readFileFrom(
    base: string,
    ownerId: string,
    path: string,
  ): Promise<FileEntry & { content: string }> {
    const fullPath = this.validatePath(base, path.startsWith('/') ? path.slice(1) : path);

    if (!existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${path}`);
    }

    const st = await stat(fullPath);
    if (st.isDirectory()) {
      throw new BadRequestException('Cannot read directory as file');
    }

    const name = fullPath.split('/').pop()!;
    const content = await readFile(fullPath, 'utf-8');

    return {
      id: pathId(ownerId, path),
      name,
      path,
      type: FileEntryType.FILE,
      size: st.size,
      mimeType: mimeFromExt(name),
      modifiedAt: st.mtime.toISOString(),
      content,
    };
  }
}
