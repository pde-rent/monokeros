'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { MagnifyingGlassIcon, SunIcon, MoonIcon, SignOutIcon, GearSixIcon, BookOpenIcon } from '@phosphor-icons/react';
import { CommandPalette } from '../shared/command-palette';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useSettingsStore } from '@/stores/settings-store';
import { Avatar, Button } from '@monokeros/ui';
import { NotificationBell } from './notification-bell';
import { SettingsDialog } from './settings-dialog';

const TAB_COUNT_KEYS: Record<string, 'org' | 'projects' | 'chat' | 'files'> = {
  Org: 'org',
  Projects: 'projects',
  Chat: 'chat',
  Files: 'files',
};

export function TopNav() {
  const pathname = usePathname();
  const params = useParams<{ workspace: string }>();
  const slug = params.workspace;
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useUIStore();
  const { user, role, logout, isAuthenticated } = useAuthStore();
  const unreadCounts = useNotificationStore((s) => s.unreadCounts);
  const { openSettingsDialog, docsWindowBehavior } = useSettingsStore();

  function handleDocsClick(e: React.MouseEvent) {
    e.preventDefault();
    if (docsWindowBehavior === 'pop-out') {
      window.open('/docs', 'monokeros-docs', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    } else {
      window.location.href = '/docs';
    }
  }

  const primaryTabs = [
    { label: 'Org', href: `/${slug}/org` },
    { label: 'Projects', href: `/${slug}/projects` },
    { label: 'Chat', href: `/${slug}/chat` },
    { label: 'Files', href: `/${slug}/files` },
    { label: 'Wiki', href: `/${slug}/wiki` },
    { label: 'Roles', href: `/${slug}/roles`, adminOnly: true },
  ];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close user menu on outside click or Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <>
      <nav className="relative flex h-[var(--layout-top-nav-height)] shrink-0 items-stretch border-b border-edge bg-surface">
        {/* Logo - left */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 font-display text-fg"
        >
          <img src="/icons/logo.svg" alt="" className="h-6 w-6" />
          <span className="text-base font-bold tracking-tight">Monoker<span className="text-blue">OS</span></span>
        </Link>

        {/* Centered nav */}
        <div className="absolute left-1/2 -translate-x-1/2 flex h-full items-stretch">
          {primaryTabs
            .filter((tab) => !('adminOnly' in tab && tab.adminOnly) || role === 'admin')
            .map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            const countKey = TAB_COUNT_KEYS[tab.label];
            const count = countKey ? unreadCounts[countKey] : 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1 px-3 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-light text-fg'
                    : 'text-fg-3 hover:bg-surface-3 hover:text-fg-2'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-sm bg-blue-bg px-0.5 text-[8px] font-bold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side: notification bell + settings + theme toggle + search + user */}
        <div className="ml-auto flex items-stretch">
          <NotificationBell />

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={openSettingsDialog}
            title="Settings"
            icon={<GearSixIcon size={14} />}
          />

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={toggleTheme}
            title={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : undefined}
            icon={mounted ? (theme === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />) : <SunIcon size={14} />}
          />

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={handleDocsClick}
            title="Documentation"
            icon={<BookOpenIcon size={14} />}
          />

          <Button
            variant="ghost"
            size="sm"
            icon={<MagnifyingGlassIcon size={14} />}
            onClick={() => setCommandPaletteOpen(true)}
            className="w-56 justify-start border-l border-edge px-3 text-xs font-medium text-fg-3 hover:text-fg-2"
          >
            <span>Search...</span>
            <span className="ml-auto text-xs">&#x2318;K</span>
          </Button>

          {isAuthenticated && user && (
            <div ref={userMenuRef} className="relative flex items-stretch">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                aria-label="User menu"
                className="flex items-center gap-1.5 border-l border-edge px-3 text-xs font-medium text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span>{user.name}</span>
              </button>

              {userMenuOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-0.5 w-56 rounded-md border border-edge bg-surface shadow-lg">
                  {/* User info */}
                  <div className="border-b border-edge px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={user.name} src={user.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-fg">{user.name}</div>
                        <div className="truncate text-[10px] text-fg-3">{user.email}</div>
                      </div>
                    </div>
                    {role && (
                      <div className="mt-1.5">
                        <span className="inline-block rounded-sm bg-surface-3 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-fg-2">
                          {role}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Settings & Logout */}
                  <div className="py-1">
                    <button
                      role="menuitem"
                      onClick={() => { setUserMenuOpen(false); openSettingsDialog(); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg"
                    >
                      <GearSixIcon size={14} />
                      <span>Settings</span>
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red transition-colors hover:bg-red-light"
                    >
                      <SignOutIcon size={14} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <SettingsDialog />
    </>
  );
}
