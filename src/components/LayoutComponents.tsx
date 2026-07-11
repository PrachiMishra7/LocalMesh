import { useState, useEffect } from 'react';
import type * as awarenessProtocol from 'y-protocols/awareness';
import type * as Y from 'yjs';
import { CollaborativeEditor } from '../features/editor/CollaborativeEditor';
import { Network, Monitor, Users, Copy, Check, Shield, Wifi, WifiOff, UserPlus } from 'lucide-react';
import type { MemberRole } from '../core/storage/db';

interface EditorProps {
  activeDocumentId: string | null;
  deviceId: string;
  activeWorkspaceId: string | null;
  activeWorkspaceKey: CryptoKey | null;
  myRole: MemberRole;
  onPeersChange: (count: number) => void;
  onAwarenessReady: (awareness: awarenessProtocol.Awareness | null) => void;
  onYdocReady: (ydoc: Y.Doc | null) => void;
}

export function EditorPlaceholder({ activeDocumentId, deviceId, activeWorkspaceId, activeWorkspaceKey, myRole, onPeersChange, onAwarenessReady, onYdocReady }: EditorProps) {
  if (!activeDocumentId || !activeWorkspaceId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--bg-panel) 100%)' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '2.5rem', background: 'var(--bg-panel)', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.07)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.75rem', boxShadow: '0 12px 24px rgba(79, 70, 229, 0.25)' }}>
            <Network size={36} color="#ffffff" />
          </div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', marginBottom: '0.75rem', fontWeight: 700 }}>Welcome to LocalMesh</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            Select a workspace and open a document from the sidebar to start collaborating peer-to-peer with end-to-end encryption.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}/>Local First
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#8b5cf6' }}/>E2E Encrypted
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6' }}/>P2P WebRTC
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CollaborativeEditor
      documentId={activeDocumentId}
      workspaceId={activeWorkspaceId}
      deviceId={deviceId}
      activeWorkspaceKey={activeWorkspaceKey}
      myRole={myRole}
      onPeersChange={onPeersChange}
      onAwarenessReady={onAwarenessReady}
      onYdocReady={onYdocReady}
    />
  );
}

interface PeerState {
  clientId: number;
  name: string;
  color: string;
}

interface SyncDashboardProps {
  deviceId: string;
  activePeers: number;
  isEncrypted?: boolean;
  awareness: awarenessProtocol.Awareness | null;
  activeWorkspaceId: string | null;
  activeWorkspaceSalt?: string | null;
  onOpenAdmin?: () => void;
}

export function SyncDashboard({ deviceId, activePeers, isEncrypted, awareness, activeWorkspaceId, activeWorkspaceSalt, onOpenAdmin }: SyncDashboardProps) {
  const [peers, setPeers] = useState<PeerState[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!awareness) {
      setPeers([]);
      return;
    }

    const updatePeers = () => {
      const states = awareness.getStates();
      const peerList: PeerState[] = [];
      states.forEach((state: any, clientId: number) => {
        if (state.user) {
          peerList.push({ clientId, name: state.user.name || `Peer-${clientId}`, color: state.user.color || '#6366f1' });
        }
      });
      setPeers(peerList);
    };

    updatePeers();
    awareness.on('change', updatePeers);
    return () => awareness.off('change', updatePeers);
  }, [awareness]);

  const handleCopy = () => {
    if (activeWorkspaceId) {
      // Include the salt in the invite so the recipient can derive the same encryption key
      const inviteStr = isEncrypted && activeWorkspaceSalt
        ? `${activeWorkspaceId}::${activeWorkspaceSalt}`
        : activeWorkspaceId;
      navigator.clipboard.writeText(inviteStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const colorPalette = ['#6366f1','#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6','#ef4444','#14b8a6'];
  
  return (
    <div style={{ 
      width: '280px', 
      backgroundColor: 'var(--bg-sidebar)', 
      borderLeft: '1px solid var(--border-subtle)', 
      padding: '0',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
          <Users size={13} /> Group Members
        </h3>
        {activeWorkspaceId && onOpenAdmin && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={onOpenAdmin}
              title="Add Member"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s', boxShadow: '0 2px 4px rgba(16,185,129,0.2)' }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(16,185,129,0.3)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(16,185,129,0.2)'; }}
            >
              <UserPlus size={11} /> Add
            </button>
            <button
              onClick={onOpenAdmin}
              title="Workspace Admin Panel"
              style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
            >
              <Shield size={11} /> Admin
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* Connection Status */}
        <div style={{ background: 'var(--bg-panel)', borderRadius: '10px', padding: '0.875rem', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: activePeers > 0 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {activePeers > 0 
                ? <><Wifi size={11} /> {activePeers} Peer{activePeers > 1 ? 's' : ''}</>
                : <><WifiOff size={11} /> Local Only</>
              }
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: activePeers > 0 ? '#10b981' : '#f59e0b', boxShadow: `0 0 6px ${activePeers > 0 ? '#10b981' : '#f59e0b'}` }} />
            </div>
          </div>
          {isEncrypted && (
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 500 }}>
              <Shield size={11} /> End-to-End Encrypted
            </div>
          )}
        </div>

        {/* Your Identity */}
        <div>
          <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>You</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--accent-primary)', boxShadow: '0 0 0 3px rgba(99,102,241,0.08)' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${colorPalette[deviceId.charCodeAt(0) % colorPalette.length]}, ${colorPalette[(deviceId.charCodeAt(1) || 2) % colorPalette.length]})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: '#fff'
            }}>
              {deviceId.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>You</p>
              <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deviceId.slice(0, 12)}...</p>
            </div>
            <Monitor size={13} color="var(--accent-primary)" />
          </div>
        </div>

        {/* Connected Peers */}
        {peers.filter(p => !deviceId.startsWith(String(p.clientId))).length > 0 && (
          <div>
            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>
              Connected ({peers.length - 1})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {peers.filter(p => String(p.clientId) !== deviceId).map(peer => (
                <div key={peer.clientId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: peer.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, color: '#fff'
                  }}>
                    {peer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>{peer.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '1px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981' }} />
                      <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 500 }}>Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting state */}
        {activePeers === 0 && (
          <div style={{ padding: '1rem', background: 'var(--bg-panel)', borderRadius: '10px', border: '1px dashed var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👋</div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              No peers connected yet.<br/>Share the Workspace ID to invite others.
            </p>
          </div>
        )}

        {/* Share Workspace */}
        {activeWorkspaceId && (
          <div>
            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.5rem' }}>Invite to Workspace</p>
            <div style={{ background: 'var(--bg-panel)', borderRadius: '10px', padding: '0.875rem', border: '1px solid var(--border-subtle)' }}>
              <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Share this ID with teammates to let them join your workspace.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.04)', borderRadius: '6px', padding: '0.5rem 0.6rem', border: '1px solid var(--border-subtle)' }}>
                <code style={{ flex: 1, fontSize: '0.65rem', color: 'var(--text-secondary)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeWorkspaceId.slice(0, 20)}...
                </code>
                <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : 'var(--accent-primary)', display: 'flex', alignItems: 'center', padding: '2px', borderRadius: '4px', flexShrink: 0 }} title="Copy workspace ID">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              {copied && <p style={{ margin: '0.4rem 0 0', fontSize: '0.68rem', color: '#10b981', fontWeight: 500 }}>✓ Copied to clipboard!</p>}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            LocalMesh · Zero-server · Local-first
          </p>
        </div>
      </div>
    </div>
  );
}
