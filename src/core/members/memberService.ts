/**
 * MemberService — manages the workspace member roster.
 *
 * The roster is stored in two places:
 *  1. Local IndexedDB (db.members) — persists across browser refreshes
 *  2. Yjs Y.Doc map ('ws_members') — syncs the roster across all connected peers
 *
 * Role Hierarchy: owner > admin > member > viewer
 *
 * Permissions:
 *  owner  → everything
 *  admin  → add/remove members, rename workspace, manage docs
 *  member → read + write docs, chat, cannot delete workspace or manage members
 *  viewer → read only (editor locked), can chat
 */

import { db } from '../storage/db';
import type { WorkspaceMember, MemberRole } from '../storage/db';
import type * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';

export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function canDo(role: MemberRole, action: 'manage_members' | 'delete_workspace' | 'rename_workspace' | 'delete_doc' | 'write_doc' | 'chat'): boolean {
  const level = ROLE_HIERARCHY[role];
  switch (action) {
    case 'manage_members':   return level >= ROLE_HIERARCHY['admin'];
    case 'delete_workspace': return level >= ROLE_HIERARCHY['owner'];
    case 'rename_workspace': return level >= ROLE_HIERARCHY['admin'];
    case 'delete_doc':       return level >= ROLE_HIERARCHY['admin'];
    case 'write_doc':        return level >= ROLE_HIERARCHY['member'];
    case 'chat':             return level >= ROLE_HIERARCHY['viewer'];
    default:                 return false;
  }
}

export function memberId(workspaceId: string, deviceId: string) {
  return `${workspaceId}:${deviceId}`;
}

/** Register yourself as the owner when you create a workspace */
export async function registerAsOwner(workspaceId: string, deviceId: string, displayName: string): Promise<WorkspaceMember> {
  const member: WorkspaceMember = {
    id: memberId(workspaceId, deviceId),
    workspaceId,
    deviceId,
    displayName,
    role: 'owner',
    status: 'active',
    addedAt: Date.now(),
    addedBy: deviceId,
  };
  await db.members.put(member);
  return member;
}

/** Register yourself as a member when you join via invite */
export async function registerAsMember(workspaceId: string, deviceId: string, displayName: string): Promise<WorkspaceMember> {
  const existing = await db.members.get(memberId(workspaceId, deviceId));
  if (existing) return existing;

  const member: WorkspaceMember = {
    id: memberId(workspaceId, deviceId),
    workspaceId,
    deviceId,
    displayName,
    role: 'member',
    status: 'active',
    addedAt: Date.now(),
    addedBy: deviceId,
  };
  await db.members.put(member);
  return member;
}

/** Add a new member manually (admin action) */
export async function addMember(workspaceId: string, newDeviceId: string, displayName: string, role: MemberRole, addedBy: string): Promise<WorkspaceMember> {
  const member: WorkspaceMember = {
    id: memberId(workspaceId, newDeviceId),
    workspaceId,
    deviceId: newDeviceId,
    displayName,
    role,
    status: 'active',
    addedAt: Date.now(),
    addedBy,
  };
  await db.members.put(member);
  return member;
}

/** Update a member's role */
export async function updateMemberRole(workspaceId: string, deviceId: string, newRole: MemberRole): Promise<void> {
  await db.members.update(memberId(workspaceId, deviceId), { role: newRole });
}

/** Remove a member (set status = removed) */
export async function removeMember(workspaceId: string, deviceId: string): Promise<void> {
  await db.members.update(memberId(workspaceId, deviceId), { status: 'removed' });
}

/** Get all active members for a workspace */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return db.members.where('workspaceId').equals(workspaceId).filter(m => m.status !== 'removed').toArray();
}

/** Get current user's role in a workspace */
export async function getMyRole(workspaceId: string, deviceId: string): Promise<MemberRole> {
  const member = await db.members.get(memberId(workspaceId, deviceId));
  if (member) return member.role;

  // Fallback for legacy workspaces created before the members table existed
  const ws = await db.workspaces.get(workspaceId);
  if (ws && (ws.createdBy === deviceId || ws.createdBy === 'local')) {
    // Auto-register them as owner since they created it
    await registerAsOwner(workspaceId, deviceId, deviceId.split('-')[0]);
    return 'owner';
  }

  return 'member';
}

/**
 * Sync the local members DB with Yjs so all peers share the roster.
 * Call this after the Y.Doc provider syncs.
 */
export async function syncMembersToYjs(workspaceId: string, ydoc: Y.Doc): Promise<void> {
  const yMembers = ydoc.getMap<WorkspaceMember>('ws_members');
  const localMembers = await getWorkspaceMembers(workspaceId);

  ydoc.transact(() => {
    for (const m of localMembers) {
      const existing = yMembers.get(m.id);
      if (!existing || existing.addedAt < m.addedAt) {
        yMembers.set(m.id, m);
      }
    }
  });
}

/**
 * Listen to Yjs member changes and write them back to local IndexedDB.
 * Returns an unsubscribe function.
 */
export function observeMembersFromYjs(workspaceId: string, ydoc: Y.Doc, onChange?: (members: WorkspaceMember[]) => void): () => void {
  const yMembers = ydoc.getMap<WorkspaceMember>('ws_members');

  const handler = async () => {
    const updates: WorkspaceMember[] = [];
    yMembers.forEach((m) => {
      if (m.workspaceId === workspaceId) {
        updates.push(m);
      }
    });

    // Write to local DB
    await db.members.bulkPut(updates);

    if (onChange) {
      const all = await getWorkspaceMembers(workspaceId);
      onChange(all);
    }
  };

  yMembers.observe(handler);
  return () => yMembers.unobserve(handler);
}

/** Push a member update to Yjs (triggers sync to all peers) */
export function pushMemberToYjs(ydoc: Y.Doc, member: WorkspaceMember): void {
  const yMembers = ydoc.getMap<WorkspaceMember>('ws_members');
  ydoc.transact(() => {
    yMembers.set(member.id, member);
  });
}

// Re-export for convenience
export { uuidv4 };
