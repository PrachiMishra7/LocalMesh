import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../core/storage/db';
import type { ActivityEvent } from '../core/storage/db';
import { X, Shield, Trash2, Edit2, RotateCcw, Clock, Users, AlertTriangle, Check } from 'lucide-react';
import type * as awarenessProtocol from 'y-protocols/awareness';

interface AdminPanelProps {
  workspaceId: string;
  deviceId: string;
  awareness: awarenessProtocol.Awareness | null;
  onClose: () => void;
  onWorkspaceDeleted: () => void;
  onWorkspaceRenamed: (newName: string) => void;
  onKeyRotated: (newSalt: string) => void;
}

interface PeerInfo {
  clientId: number;
  name: string;
  color: string;
}

export function AdminPanel({
  workspaceId, deviceId, awareness,
  onClose, onWorkspaceDeleted, onWorkspaceRenamed, onKeyRotated
}: AdminPanelProps) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'log' | 'settings'>('members');

  // Load workspace + activity
  useEffect(() => {
    db.workspaces.get(workspaceId).then(ws => {
      setWorkspace(ws);
      setNewName(ws?.name || '');
    });
    db.activity.where('workspaceId').equals(workspaceId).reverse().sortBy('timestamp').then(setActivityLog);
  }, [workspaceId]);

  // Track live peers from awareness
  useEffect(() => {
    if (!awareness) return;
    const update = () => {
      const list: PeerInfo[] = [];
      awareness.getStates().forEach((state: any, clientId: number) => {
        if (state.user) {
          list.push({ clientId, name: state.user.name || `Peer-${clientId}`, color: state.user.color || '#6366f1' });
        }
      });
      setPeers(list);
    };
    update();
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [awareness]);

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === workspace?.name) return;
    await db.workspaces.update(workspaceId, { name: newName.trim() });
    setNameSaved(true);
    onWorkspaceRenamed(newName.trim());
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleDelete = async () => {
    // Delete workspace, all its documents, and activity
    await db.documents.where('workspaceId').equals(workspaceId).delete();
    await db.activity.where('workspaceId').equals(workspaceId).delete();
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

  const isAdmin = workspace?.createdBy === deviceId || workspace?.createdBy === 'local';
  const tabs = ['members', 'log', 'settings'] as const;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: '20px', width: '480px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-subtle)', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Workspace Admin
                  {isAdmin && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '2px 7px', borderRadius: '10px', fontWeight: 600, letterSpacing: '0.04em' }}>OWNER</span>}
                </h2>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{workspaceId.slice(0, 22)}...</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-sidebar)' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '0.75rem', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                textTransform: 'capitalize', transition: 'all 0.15s'
              }}
            >
              {tab === 'members' && `👥 Members (${peers.length})`}
              {tab === 'log' && `📋 Activity Log`}
              {tab === 'settings' && `⚙️ Settings`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {peers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} /><br />
                  No members currently online in this workspace.
                </div>
              )}
              {peers.map(peer => {
                const isSelf = peer.name === deviceId.split('-')[0];
                const isOwner = workspace?.createdBy === deviceId && isSelf;
                return (
                  <div key={peer.clientId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', background: 'var(--bg-sidebar)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: peer.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {peer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{peer.name}</span>
                        {isSelf && <span style={{ fontSize: '0.62rem', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)', padding: '1px 6px', borderRadius: '6px', fontWeight: 600 }}>YOU</span>}
                        {isOwner && <span style={{ fontSize: '0.62rem', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>ADMIN</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 500 }}>Online now</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isAdmin && peers.length > 1 && (
                <div style={{ marginTop: '0.5rem', padding: '0.875rem', background: 'rgba(245,158,11,0.06)', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong>⚠️ To remove access:</strong> Since this is a decentralized P2P system, you can't force-kick a peer. To revoke access, go to <strong>Settings → Rotate Encryption Key</strong>. Everyone will need the new invite to reconnect.
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY LOG TAB */}
          {activeTab === 'log' && (
            <div>
              {activityLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <Clock size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} /><br />
                  No activity recorded yet. Activity is logged when peers join or leave.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {activityLog.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.875rem', background: 'var(--bg-sidebar)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ev.event === 'join' ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--mono)' }}>{ev.peerId}</span>
                        <span style={{ fontSize: '0.75rem', color: ev.event === 'join' ? '#10b981' : '#f59e0b', marginLeft: '0.4rem', fontWeight: 500 }}>
                          {ev.event === 'join' ? '↑ joined' : '↓ left'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Rename */}
              <div style={{ padding: '1rem', background: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Edit2 size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Rename Workspace</span>
                  {!isAdmin && <span style={{ fontSize: '0.65rem', color: '#f59e0b' }}>Admin only</span>}
                </div>
                {isAdmin ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename()}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '7px', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button onClick={handleRename} style={{ padding: '0.5rem 0.875rem', borderRadius: '7px', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {nameSaved ? <><Check size={13} /> Saved</> : 'Save'}
                    </button>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Only the workspace owner can rename it.</p>
                )}
              </div>

              {/* Rotate Key */}
              {workspace?.hasPassword && isAdmin && (
                <div style={{ padding: '1rem', background: 'rgba(139,92,246,0.05)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <RotateCcw size={14} color="#8b5cf6" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Rotate Encryption Key</span>
                  </div>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Generates a new encryption salt. All current members will lose access — they must rejoin using your new invite code. Use this to revoke access from a member.
                  </p>
                  {!confirmRotate ? (
                    <button onClick={() => setConfirmRotate(true)} style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: '1px solid #8b5cf6', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      Rotate Key
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <AlertTriangle size={14} color="#f59e0b" />
                      <span style={{ fontSize: '0.75rem', color: '#f59e0b', flex: 1 }}>Everyone will be disconnected. Are you sure?</span>
                      <button onClick={handleRotateKey} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Yes, Rotate</button>
                      <button onClick={() => setConfirmRotate(false)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                    </div>
                  )}
                </div>
              )}

              {/* Delete Workspace */}
              <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.04)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Trash2 size={14} color="#ef4444" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444' }}>Delete Workspace</span>
                </div>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Permanently deletes this workspace and all its documents from <strong>your device</strong>. Other peers keep their own copies.
                </p>
                {!confirmDelete ? (
                  <button
                    onClick={() => isAdmin ? setConfirmDelete(true) : null}
                    disabled={!isAdmin}
                    style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: isAdmin ? '#ef4444' : 'var(--text-muted)', cursor: isAdmin ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    {isAdmin ? 'Delete Workspace' : 'Admin Only'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', flex: 1 }}>This cannot be undone. Delete anyway?</span>
                    <button onClick={handleDelete} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Delete</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
