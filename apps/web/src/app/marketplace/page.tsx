"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api as convexApi } from "../../../convex/_generated/api";
import { createTextFilter } from "@monokeros/utils";
import { Badge, Input } from "@monokeros/ui";
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  UsersIcon,
  UsersFourIcon,
  PackageIcon,
  SpinnerIcon,
  FileXIcon,
} from "@phosphor-icons/react";

interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  industry: string;
  agentCount: number;
  teamCount: number;
}

const filterTemplates = createTextFilter<TemplateSummary>("name", "description");

export default function MarketplacePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const templates = useQuery(convexApi.templates.list, isAuthenticated ? {} : "skip");
  const loading = templates === undefined;
  const [search, setSearch] = useState("");

  if (!authLoading && !isAuthenticated) {
    router.replace("/login");
    return null;
  }

  const filtered = filterTemplates(templates ?? [], search);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-edge bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-xs text-fg-3 transition-colors hover:text-fg-2"
          >
            <ArrowLeftIcon size={14} />
            Workspaces
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/logo.svg" alt="" className="h-6 w-6" />
            <h1 className="text-sm font-bold tracking-tight font-display text-fg">Marketplace</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Search */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-3"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-8"
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-xs text-fg-3">
            <SpinnerIcon size={24} className="animate-spin" />
            Loading templates...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-xs text-fg-3">
            <FileXIcon size={24} />
            No templates found
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => router.push(`/marketplace/${tpl.id}`)}
                className="flex flex-col rounded-md border border-edge bg-elevated p-5 text-left transition-all hover:border-edge-hover hover:bg-surface-3"
              >
                {/* Icon + Name */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-3">
                    <PackageIcon size={20} className="text-fg-2" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-fg">{tpl.name}</div>
                    <div className="text-[10px] text-fg-3">{tpl.industry}</div>
                  </div>
                </div>

                {/* Description */}
                <p className="mb-4 flex-1 text-xs leading-relaxed text-fg-2">{tpl.description}</p>

                {/* Footer */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-fg-3">
                    <UsersIcon size={12} />
                    {tpl.agentCount} agents
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-fg-3">
                    <UsersFourIcon size={12} />
                    {tpl.teamCount} teams
                  </div>
                  <div className="flex-1" />
                  <Badge>{tpl.industry}</Badge>
                  <Badge variant="subtle">Free</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
