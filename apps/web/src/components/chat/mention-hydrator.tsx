'use client';

import { useEffect, useCallback } from 'react';
import { useMembers, useProjects, useTasks, useDrives } from '@/hooks/use-queries';
import { useAgencyNavigation } from '@/hooks/use-agency-navigation';
import type { FileEntry } from '@monokeros/types';

interface Props {
  containerRef: React.RefObject<HTMLElement | null>;
  /** Signal to re-attach listeners (e.g. messages.length) */
  signal?: number;
}

/** Flatten all file entries from drives into a lookup map by name */
function buildFileLookup(entries: FileEntry[], map: Map<string, FileEntry> = new Map()): Map<string, FileEntry> {
  for (const entry of entries) {
    if (entry.type === 'file') {
      map.set(entry.name, entry);
    }
    if (entry.children) {
      buildFileLookup(entry.children, map);
    }
  }
  return map;
}

/**
 * Attaches click handlers to `.mention[data-mention-type]` elements via event
 * delegation. Works for both React-rendered user message spans and
 * dangerouslySetInnerHTML agent message spans.
 */
export function MentionHydrator({ containerRef, signal }: Props) {
  const { data: members } = useMembers();
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const { data: drives } = useDrives();
  const {
    goToAgentDiagram,
    goToProjectDetail,
    goToTaskDetail,
    goToFile,
  } = useAgencyNavigation();

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-mention-type]');
      if (!target) return;

      const type = target.dataset.mentionType;
      const name = target.dataset.mentionName;
      if (!type || !name) return;

      switch (type) {
        case 'agent': {
          const member = members?.find(
            (m) => m.name.replace(/\s+/g, '-') === name || m.name === name,
          );
          if (member) {
            e.preventDefault();
            goToAgentDiagram(member.id);
          }
          break;
        }
        case 'project': {
          const project = projects?.find(
            (p) => p.name.replace(/\s+/g, '-') === name || p.name === name,
          );
          if (project) {
            e.preventDefault();
            goToProjectDetail(project.id);
          }
          break;
        }
        case 'task': {
          const task = tasks?.find((t) => t.id === name || t.title === name);
          if (task) {
            e.preventDefault();
            goToTaskDetail(task.projectId, task.id);
          }
          break;
        }
        case 'file': {
          if (!drives) break;
          const fileLookup = new Map<string, FileEntry>();
          for (const d of drives.teamDrives) buildFileLookup(d.files, fileLookup);
          for (const d of drives.memberDrives) buildFileLookup(d.files, fileLookup);
          if (drives.projectDrives) {
            for (const d of drives.projectDrives) buildFileLookup(d.files, fileLookup);
          }
          if (drives.workspaceDrive) {
            buildFileLookup(drives.workspaceDrive.files, fileLookup);
          }
          const file = fileLookup.get(name);
          if (file) {
            e.preventDefault();
            goToFile(file.id);
          }
          break;
        }
      }
    },
    [members, projects, tasks, drives, goToAgentDiagram, goToProjectDetail, goToTaskDetail, goToFile],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [containerRef, handleClick, signal]);

  return null;
}
