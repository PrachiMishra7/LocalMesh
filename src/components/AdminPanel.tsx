import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../core/storage/db';
import type { ActivityEvent, WorkspaceMember, MemberRole } from '../core/storage/db';
import {
  X, Shield, Trash2, Edit2, RotateCcw, Clock, Users,
  AlertTriangle, Check, UserPlus, ChevronDown, Crown, Eye, Pencil, ShieldCheck
} from 'lucide-react';
import type * as awarenessProtocol from 'y-protocols/awareness';
import {
  addMember, updateMemberRole, removeMember,
  getWorkspaceMembers, canDo, pushMemberToYjs
} from '../core/members/memberService';
import type * as Y from 'yjs';

interface AdminPanelProps {
  workspaceId: string;
  deviceId: string;
  myRole: MemberRole;
  awareness: awarenessProtocol.Awareness | null;
  ydoc: Y.Doc | null;
  onClose: () => void;
  onWorkspaceDeleted: () => void;
  onWorkspaceRenamed: (newName: string) => void;
  onKeyRotated: (newSalt: string) => void;
}

const ROLE_COLORS: Record<MemberRole, string> = {
  owner: '#f59e0b',
  admin: '#6366f1',
  member: '#10b981',
  viewer: '#94a3b8',
};

const ROLE_ICONS: Record<MemberRole, React.ReactNode> = {
  owner: <Crown size={11} />,
  admin: <ShieldCheck size={11} />,
  member: <Pencil size={11} />,
  viewer: <Eye size={11} />,
};

function RoleBadge({ role }: { role: MemberRole }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px',
      borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.04em',
      background: `${ROLE_COLORS[role]}18`, color: ROLE_COLORS[role],
      border: `1px solid ${ROLE_COLORS[role]}40`
    }}>
      {ROLE_ICONS[role]} {role}
    </span>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({ onClose, onAdd }: { onClose: () => void; onAdd: (deviceId: string, name: string, role: MemberRole) => void }) {
  const [peerDeviceId, setPeerDeviceId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peerDeviceId.trim()) { setError('Device ID is required'); return; }
    if (!displayName.trim()) { setError('Display name is required'); return; }
    onAdd(peerDeviceId.trim(), displayName.trim(), role);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '1.75rem', width: '380px', maxWidth: '90vw', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={15} color="#fff" />
            </div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add Member</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Device ID</label>
            <input
              autoFocus
              value={peerDeviceId}
              onChange={e => { setPeerDeviceId(e.target.value); setError(''); }}
              placeholder="Paste their Device ID from the sidebar"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-sidebar)', color: 'var(--text-primary)', fontSize: '0.78rem', fontFamily: 'var(--mono)', outline: 'none' }}
            />
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.67rem', color: 'var(--text-muted)' }}>Find it at the bottom of the left sidebar.</p>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Display Name</label>
            <input
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setError(''); }}
              placeholder="e.g. Prachi Mishra"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-sidebar)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Role</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['admin', 'member', 'viewer'] as MemberRole[]).map(r => (
                <button
                  key={r} type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: '0.5rem 0.25rem', borderRadius: '8px', border: `1.5px solid ${role === r ? ROLE_COLORS[r] : 'var(--border-subtle)'}`,
                    background: role === r ? `${ROLE_COLORS[r]}15` : 'var(--bg-sidebar)',
                    color: role === r ? ROLE_COLORS[r] : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', transition: 'all 0.15s'
                  }}
                >
                  {ROLE_ICONS[r]}
                  <span style={{ textTransform: 'capitalize' }}>{r}</span>
                </button>
              ))}
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.67rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {role === 'admin' && 'Can manage members, rename workspace, delete documents.'}
              {role === 'member' && 'Can read, write and chat. Cannot manage members or delete workspace.'}
              {role === 'viewer' && 'Read-only access to documents. Can chat but cannot edit.'}
            </p>
          </div>

          {error && <p style={{ margin: 0, fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border-subtle)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>Cancel</button>
            <button type="submit" style={{ flex: 2, padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>Add Member</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Role Dropdown ─────────────────────────────────────────────────────────────
function RoleDropdown({ current, onChange, disabled }: { current: MemberRole; onChange: (r: MemberRole) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const roles: MemberRole[] = ['admin', 'member', 'viewer'];

  return (
    <div style={{ position: 'relative' }}>
      <button
        disabled={disabled}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', border: `1px solid ${ROLE_COLORS[current]}40`, background: `${ROLE_COLORS[current]}12`, color: ROLE_COLORS[current], cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}
      >
        {ROLE_ICONS[current]} {current} {!disabled && <ChevronDown size={10} />}
      </button>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: '110%', zIndex: 200, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,0.15)', minWidth: '110px', padding: '4px', overflow: 'hidden' }}>
          {roles.map(r => (
            <button key={r} onClick={() => { onChange(r); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '0.45rem 0.6rem', border: 'none', borderRadius: '5px', background: r === current ? `${ROLE_COLORS[r]}12` : 'none', color: r === current ? ROLE_COLORS[r] : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', textAlign: 'left' }}>
              {ROLE_ICONS[r]} {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
export function AdminPanel({
  workspaceId, deviceId, myRole, ydoc,
  onClose, onWorkspaceDeleted, onWorkspaceRenamed, onKeyRotated
}: AdminPanelProps) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'log' | 'settings'>('members');
  const [showAddMember, setShowAddMember] = useState(false);

  const isAdmin = canDo(myRole, 'manage_members');

  // Load workspace + members + activity
  useEffect(() => {
    db.workspaces.get(workspaceId).then(ws => { setWorkspace(ws); setNewName(ws?.name || ''); });
    getWorkspaceMembers(workspaceId).then(setMembers);
    db.activity.where('workspaceId').equals(workspaceId).reverse().sortBy('timestamp').then(setActivityLog);
  }, [workspaceId]);

  const handleAddMember = async (peerDeviceId: string, displayName: string, role: MemberRole) => {
    const member = await addMember(workspaceId, peerDeviceId, displayName, role, deviceId);
    if (ydoc) pushMemberToYjs(ydoc, member);
    setMembers(await getWorkspaceMembers(workspaceId));
    setShowAddMember(false);
  };

  const handleRoleChange = async (targetDeviceId: string, newRole: MemberRole) => {
    await updateMemberRole(workspaceId, targetDeviceId, newRole);
    const updated = await getWorkspaceMembers(workspaceId);
    setMembers(updated);
    if (ydoc) {
      const m = updated.find(m => m.deviceId === targetDeviceId);
      if (m) pushMemberToYjs(ydoc, m);
    }
  };

  const handleRemoveMember = async (targetDeviceId: string) => {
    await removeMember(workspaceId, targetDeviceId);
    setMembers(await getWorkspaceMembers(workspaceId));
    setConfirmRemove(null);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === workspace?.name) return;
    await db.workspaces.update(workspaceId, { name: newName.trim() });
    setNameSaved(true);
    onWorkspaceRenamed(newName.trim());
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleDelete = async () => {
    await db.documents.where('workspaceId').equals(workspaceId).delete();
    await db.activity.where('workspaceId').equals(workspaceId).delete();
    await db.members.where('workspaceId').equals(workspaceId).delete();
    await db.workspaces.delete(workspaceId);
    onWorkspaceDeleted();
  };

  const handleRotateKey = async () => {
    const newSalt = uuidv4();
    await db.workspaces.update(workspaceId, { passwordSalt: newSalt });
    setConfirmRotate(false);
    onKeyRotated(newSalt);
    onClose();
  };

  const tabs = ['members', 'log', 'settings'] as const;

  return (
    <>
      {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} onAdd={handleAddMember} />}

      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
        <div style={{ background: 'var(--bg-panel)', borderRadius: '20px', width: '500px', maxWidth: '95vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-subtle)', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.04))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Workspace Admin
                  <RoleBadge role={myRole} />
                </h2>
                <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{workspaceId.slice(0, 24)}...</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-sidebar)' }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '0.7rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent', transition: 'all 0.15s' }}>
                {tab === 'members' && `👥 Members (${members.length})`}
                {tab === 'log' && '📋 Activity'}
                {tab === 'settings' && '⚙️ Settings'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>

            {/* ── MEMBERS TAB ── */}
            {activeTab === 'members' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', borderRadius: '10px', border: '1.5px dashed var(--accent-primary)', background: 'rgba(99,102,241,0.04)', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, width: '100%', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                  >
                    <UserPlus size={15} /> Add Member
                  </button>
                )}

                {members.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <Users size={28} style={{ marginBottom: '0.5rem', opacity: 0.35, display: 'block', margin: '0 auto 0.5rem' }} />
                    No members registered yet.
                  </div>
                )}

                {members.map(member => {
                  const isSelf = member.deviceId === deviceId;
                  const isOwner = member.role === 'owner';
                  const canManage = isAdmin && !isSelf && !isOwner;

                  return (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: isSelf ? 'rgba(99,102,241,0.05)' : 'var(--bg-sidebar)', borderRadius: '10px', border: `1px solid ${isSelf ? 'rgba(99,102,241,0.2)' : 'var(--border-subtle)'}` }}>
                      {/* Avatar */}
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg,${ROLE_COLORS[member.role]},${ROLE_COLORS[member.role]}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#fff', flexShrink: 0, boxShadow: `0 2px 8px ${ROLE_COLORS[member.role]}40` }}>
                        {member.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{member.displayName}</span>
                          {isSelf && <span style={{ fontSize: '0.6rem', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>YOU</span>}
                          <RoleBadge role={member.role} />
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {member.deviceId.slice(0, 22)}...
                        </div>
                      </div>
                      {/* Role change dropdown */}
                      {canManage && (
                        <RoleDropdown current={member.role} onChange={r => handleRoleChange(member.deviceId, r)} />
                      )}
                      {/* Remove button */}
                      {canManage && (
                        confirmRemove === member.deviceId ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleRemoveMember(member.deviceId)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>Remove</button>
                            <button onClick={() => setConfirmRemove(null)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmRemove(member.deviceId)} title="Remove member" style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', transition: 'all 0.15s' }} onMouseOver={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }} onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                            <Trash2 size={13} />
                          </button>
                        )
                      )}
                    </div>
                  );
                })}

                {/* Role explanation */}
                <div style={{ marginTop: '0.5rem', padding: '0.875rem', background: 'rgba(0,0,0,0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Role Permissions</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {(['owner', 'admin', 'member', 'viewer'] as MemberRole[]).map(r => (
                      <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RoleBadge role={r} />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {r === 'owner' && 'Full control — delete workspace, rotate keys'}
                          {r === 'admin' && 'Manage members, rename workspace, delete docs'}
                          {r === 'member' && 'Read & write docs, chat'}
                          {r === 'viewer' && 'Read-only docs, chat only'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ACTIVITY TAB ── */}
            {activeTab === 'log' && (
              <div>
                {activityLog.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <Clock size={28} style={{ opacity: 0.35, display: 'block', margin: '0 auto 0.5rem' }} />
                    No activity recorded yet. Activity is logged when peers connect.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {activityLog.map(ev => (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.875rem', background: 'var(--bg-sidebar)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ev.event === 'join' ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--mono)', flex: 1 }}>{ev.peerId}</span>
                        <span style={{ fontSize: '0.72rem', color: ev.event === 'join' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{ev.event === 'join' ? '↑ joined' : '↓ left'}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {/* Rename */}
                <div style={{ padding: '1rem', background: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Edit2 size={13} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Rename Workspace</span>
                    {!isAdmin && <span style={{ fontSize: '0.62rem', color: '#f59e0b', marginLeft: 'auto' }}>Admin only</span>}
                  </div>
                  {isAdmin ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename()} style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '7px', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }} />
                      <button onClick={handleRename} style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {nameSaved ? <><Check size={13} /> Saved</> : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Only admins can rename the workspace.</p>
                  )}
                </div>

                {/* Rotate Key */}
                {workspace?.hasPassword && isAdmin && (
                  <div style={{ padding: '1rem', background: 'rgba(139,92,246,0.05)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <RotateCcw size={13} color="#8b5cf6" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Rotate Encryption Key</span>
                    </div>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Generates a new encryption salt — all current members lose access and must rejoin with your new invite. Use this to revoke a member's access permanently.
                    </p>
                    {!confirmRotate ? (
                      <button onClick={() => setConfirmRotate(true)} style={{ padding: '0.45rem 1rem', borderRadius: '7px', border: '1px solid #8b5cf6', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Rotate Key</button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <AlertTriangle size={14} color="#f59e0b" />
                        <span style={{ fontSize: '0.73rem', color: '#f59e0b', flex: 1 }}>Everyone will lose access. Continue?</span>
                        <button onClick={handleRotateKey} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontSize: '0.73rem', fontWeight: 600 }}>Yes, Rotate</button>
                        <button onClick={() => setConfirmRotate(false)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.73rem' }}>Cancel</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Delete */}
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.04)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Trash2 size={13} color="#ef4444" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444' }}>Delete Workspace</span>
                    {myRole !== 'owner' && <span style={{ fontSize: '0.62rem', color: '#f59e0b', marginLeft: 'auto' }}>Owner only</span>}
                  </div>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Deletes this workspace, all documents, members, and activity from <strong>your device</strong>. Other peers keep their copies.
                  </p>
                  {!confirmDelete ? (
                    <button disabled={myRole !== 'owner'} onClick={() => myRole === 'owner' && setConfirmDelete(true)} style={{ padding: '0.45rem 1rem', borderRadius: '7px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: myRole === 'owner' ? '#ef4444' : 'var(--text-muted)', cursor: myRole === 'owner' ? 'pointer' : 'not-allowed', fontSize: '0.78rem', fontWeight: 600 }}>
                      {myRole === 'owner' ? 'Delete Workspace' : 'Owner Only'}
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <AlertTriangle size={14} color="#ef4444" />
                      <span style={{ fontSize: '0.73rem', color: '#ef4444', flex: 1 }}>This cannot be undone. Delete anyway?</span>
                      <button onClick={handleDelete} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.73rem', fontWeight: 600 }}>Delete</button>
                      <button onClick={() => setConfirmDelete(false)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.73rem' }}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
