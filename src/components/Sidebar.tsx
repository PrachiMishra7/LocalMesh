import { useState } from 'react';
import { db } from '../core/storage/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { Folder, FileText, Plus, Settings, Users, LogIn, X, Lock, Shield } from 'lucide-react';
import { registerAsOwner, registerAsMember } from '../core/members/memberService';

interface SidebarProps {
  deviceId: string;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string, hasPassword?: boolean, salt?: string) => void;
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string) => void;
}

// ─── Join Workspace Modal ──────────────────────────────────────────────────────
function JoinModal({ onClose, onJoin }: { onClose: () => void; onJoin: (id: string, name: string, hasPassword: boolean, salt?: string) => void }) {
  const [inviteStr, setInviteStr] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Parse the invite string to detect if it includes a salt (encrypted workspace)
  const parseInvite = (raw: string) => {
    const parts = raw.trim().split('::');
    return { wsId: parts[0], salt: parts[1] || undefined, isEncrypted: parts.length === 2 };
  };

  const parsed = parseInvite(inviteStr);
  const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteStr.trim()) { setError('Please paste an Invite Code or Workspace ID.'); return; }
    if (!name.trim()) { setError('Please enter a name for this workspace.'); return; }
    if (!uuidRx.test(parsed.wsId)) { setError('The Workspace ID part doesn\'t look valid. Make sure you copied the full invite code.'); return; }
    onJoin(parsed.wsId, name.trim(), parsed.isEncrypted, parsed.salt);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '2rem', width: '400px', maxWidth: '90vw', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogIn size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Join Workspace</h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Paste the invite code shared with you</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Invite Code
            </label>
            <textarea
              autoFocus
              value={inviteStr}
              onChange={e => { setInviteStr(e.target.value); setError(''); }}
              placeholder="Paste the invite code here..."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.6rem 0.75rem', borderRadius: '8px',
                border: error ? '1.5px solid #ef4444' : '1.5px solid var(--border-subtle)',
                background: 'var(--bg-sidebar)', color: 'var(--text-primary)',
                fontSize: '0.75rem', fontFamily: 'var(--mono)',
                outline: 'none', resize: 'vertical'
              }}
            />
            {/* Auto-detection badge */}
            {parsed.wsId && uuidRx.test(parsed.wsId) && (
              <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: '#10b981', fontWeight: 500 }}>Valid workspace ID detected</span>
                {parsed.isEncrypted && (
                  <span style={{ color: '#8b5cf6', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    · <Shield size={11} /> Encrypted workspace — you'll need the password
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Workspace Name (local label)
            </label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Engineering Team"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.6rem 0.75rem', borderRadius: '8px',
                border: '1.5px solid var(--border-subtle)',
                background: 'var(--bg-sidebar)', color: 'var(--text-primary)',
                fontSize: '0.85rem', outline: 'none'
              }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          {/* Info box */}
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            💡 <strong>How it works:</strong> Once you join, your device will automatically connect to others in the same workspace over a peer-to-peer WebRTC connection — no server stores your data.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1.5px solid var(--border-subtle)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
              Cancel
            </button>
            <button type="submit" style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <LogIn size={15} /> Join Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── New Workspace Modal ───────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, password: string) => void }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), password);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '2rem', width: '400px', maxWidth: '90vw', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>New Workspace</h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Create a collaborative space</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Workspace Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Engineering Team"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-sidebar)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Lock size={11} /> Encryption Password <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)', letterSpacing: 0 }}>(optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave blank for no encryption"
                style={{ width: '100%', boxSizing: 'border-box', padding: '0.6rem 2.5rem 0.6rem 0.75rem', borderRadius: '8px', border: `1.5px solid ${password ? '#8b5cf6' : 'var(--border-subtle)'}`, background: 'var(--bg-sidebar)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', transition: 'border 0.2s' }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            {password && <p style={{ margin: '0.3rem 0 0', fontSize: '0.7rem', color: '#8b5cf6' }}>🔒 This workspace will be end-to-end encrypted</p>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1.5px solid var(--border-subtle)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()} style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', border: 'none', background: name.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--border-subtle)', color: name.trim() ? '#fff' : 'var(--text-muted)', cursor: name.trim() ? 'pointer' : 'not-allowed', fontSize: '0.85rem', fontWeight: 600 }}>
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({ 
  deviceId, 
  activeWorkspaceId, 
  setActiveWorkspaceId,
  activeDocumentId,
  setActiveDocumentId
}: SidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const workspaces = useLiveQuery(() => db.workspaces.orderBy('createdAt').reverse().toArray());
  const documents = useLiveQuery(
    async () => {
      if (!activeWorkspaceId) return [];
      const docs = await db.documents.where('workspaceId').equals(activeWorkspaceId).toArray();
      return docs.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    [activeWorkspaceId]
  );

  const handleCreate = async (name: string, password: string) => {
    const id = uuidv4();
    const ws: any = { id, name, createdAt: Date.now(), createdBy: deviceId };
    if (password.trim().length > 0) {
      ws.hasPassword = true;
      ws.passwordSalt = uuidv4();
    }
    await db.workspaces.put(ws);
    // Auto-register creator as owner
    await registerAsOwner(id, deviceId, deviceId.slice(0, 8));
    setShowCreate(false);
    setActiveWorkspaceId(id, ws.hasPassword, ws.passwordSalt);
  };

  const handleJoin = async (id: string, name: string, hasPassword: boolean, salt?: string) => {
    const existing = await db.workspaces.get(id);
    if (!existing) {
      const ws: any = { id, name, createdAt: Date.now(), createdBy: 'remote' };
      if (hasPassword) { ws.hasPassword = true; ws.passwordSalt = salt || id; }
      await db.workspaces.put(ws);
    }
    // Auto-register as member
    await registerAsMember(id, deviceId, deviceId.slice(0, 8));
    setShowJoin(false);
    setActiveWorkspaceId(id, existing?.hasPassword || hasPassword, existing?.passwordSalt || salt || id);
  };

  const handleCreateDocument = async () => {
    if (!activeWorkspaceId) return;
    const title = prompt('Enter Document Title:');
    if (!title) return;
    const id = uuidv4();
    await db.documents.put({ id, workspaceId: activeWorkspaceId, title, createdAt: Date.now(), updatedAt: Date.now() });
    setActiveDocumentId(id);
  };

  return (
    <>
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} onJoin={handleJoin} />}

      <div style={{ width: '280px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
        
        {/* Brand */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(99,102,241,0.3)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            </div>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>LocalMesh</h1>
              <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: 0, letterSpacing: '0.03em' }}>PEER-TO-PEER</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          {/* Workspaces */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Workspaces</h3>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={() => setShowJoin(true)}
                  title="Join existing workspace"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 500 }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <LogIn size={13} /> Join
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  title="Create new workspace"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 500 }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Plus size={13} /> New
                </button>
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {workspaces?.map(ws => (
                <li 
                  key={ws.id} 
                  onClick={() => { setActiveWorkspaceId(ws.id, ws.hasPassword, ws.passwordSalt); setActiveDocumentId(''); }}
                  style={{
                    padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '7px',
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    fontSize: '0.85rem', fontWeight: activeWorkspaceId === ws.id ? 600 : 400,
                    backgroundColor: activeWorkspaceId === ws.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: activeWorkspaceId === ws.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: activeWorkspaceId === ws.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => { if(activeWorkspaceId !== ws.id) { e.currentTarget.style.backgroundColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
                  onMouseOut={e => { if(activeWorkspaceId !== ws.id) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
                >
                  <Folder size={15} strokeWidth={activeWorkspaceId === ws.id ? 2.5 : 2} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.name}</span>
                  {ws.hasPassword && <Lock size={11} style={{ opacity: 0.6, flexShrink: 0 }} />}
                  {ws.createdBy === 'remote' && <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '1px 5px', borderRadius: '3px', fontWeight: 600, flexShrink: 0 }}>JOINED</span>}
                </li>
              ))}
              {workspaces?.length === 0 && (
                <li style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  Create or join a workspace to begin.
                </li>
              )}
            </ul>
          </div>

          {/* Documents */}
          {activeWorkspaceId && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Documents</h3>
                <button
                  onClick={handleCreateDocument}
                  title="New document"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 500 }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Plus size={13} /> New
                </button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {documents?.map(doc => (
                  <li 
                    key={doc.id}
                    onClick={() => setActiveDocumentId(doc.id)}
                    style={{ 
                      padding: '0.5rem 0.75rem', cursor: 'pointer', borderRadius: '7px',
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      fontSize: '0.85rem', fontWeight: activeDocumentId === doc.id ? 600 : 400,
                      backgroundColor: activeDocumentId === doc.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                      color: activeDocumentId === doc.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      border: activeDocumentId === doc.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={e => { if(activeDocumentId !== doc.id) { e.currentTarget.style.backgroundColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
                    onMouseOut={e => { if(activeDocumentId !== doc.id) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
                  >
                    <FileText size={14} strokeWidth={activeDocumentId === doc.id ? 2.5 : 2} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</span>
                  </li>
                ))}
                {documents?.length === 0 && (
                  <li style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    No documents yet. Click + New.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={14} color="#fff" />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>My Device</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--mono)' }}>{deviceId.slice(0, 14)}...</div>
          </div>
          <Settings size={14} color="var(--text-muted)" style={{ cursor: 'pointer', flexShrink: 0 }} />
        </div>
      </div>
    </>
  );
}
