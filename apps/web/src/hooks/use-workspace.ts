"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Returns the Convex workspace ID for the current route's workspace slug.
 * Returns undefined while loading or if no workspace slug is in the URL.
 */
export function useWorkspaceId(): Id<"workspaces"> | undefined {
  const { workspace } = useParams<{ workspace: string }>();
  const ws = useQuery(api.workspaces.getBySlug, workspace ? { slug: workspace } : "skip");
  return ws?._id;
}

/**
 * Returns the full workspace document for the current route's workspace slug.
 */
export function useWorkspace() {
  const { workspace } = useParams<{ workspace: string }>();
  return useQuery(api.workspaces.getBySlug, workspace ? { slug: workspace } : "skip");
}
