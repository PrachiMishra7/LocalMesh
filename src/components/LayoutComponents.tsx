import { CollaborativeEditor } from '../features/editor/CollaborativeEditor';

interface EditorProps {
  activeDocumentId: string | null;
  deviceId: string;
  activeWorkspaceId: string | null;
  activeWorkspaceKey: CryptoKey | null;
  onPeersChange: (count: number) => void;
}

export function EditorPlaceholder({ activeDocumentId, deviceId, activeWorkspaceId, activeWorkspaceKey, onPeersChange }: EditorProps) {
  if (!activeDocumentId || !activeWorkspaceId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'linear-gradient(135deg, var(--bg-app) 0%, var(--bg-panel) 100%)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem', background: 'var(--bg-panel)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)' }}>
            <Network size={32} color="#ffffff" />
          </div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>Welcome to LocalMesh</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '2rem' }}>
            Select a workspace and open a document from the sidebar to start collaborating in real-time, completely peer-to-peer.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}/> Local First</span>
            <span style={{ margin: '0 0.5rem' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8b5cf6' }}/> E2E CRDTs</span>
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
      onPeersChange={onPeersChange}
    />
  );
}

import { Network, Monitor } from 'lucide-react';

export function SyncDashboard({ deviceId, activePeers, isEncrypted }: { deviceId: string, activePeers: number, isEncrypted?: boolean }) {
  return (
    <div style={{ 
      width: '280px', 
      backgroundColor: 'var(--bg-sidebar)', 
      borderLeft: '1px solid var(--border-subtle)', 
      padding: '1.5rem 1.25rem', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Network size={14} /> Network Status {isEncrypted && <span style={{ color: '#8b5cf6' }}>(Encrypted)</span>}
      </h3>
      
      <div style={{ marginBottom: '1.5rem', background: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Connection</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: activePeers > 0 ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activePeers > 0 ? '#10b981' : '#f59e0b', boxShadow: `0 0 8px ${activePeers > 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(245, 158, 11, 0.6)'}` }} />
            {activePeers > 0 ? 'Connected' : 'Offline / Local'}
          </div>
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.4rem' }}>Device ID</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontFamily: 'var(--mono)', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.05)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            <Monitor size={14} color="var(--accent-primary)" /> 
            {deviceId.split('-')[0]}...
          </div>
        </div>
      </div>
      
      <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>Active Peers ({activePeers})</p>
        <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>
          {activePeers > 0 
            ? `Connected to ${activePeers} peer(s) via WebRTC DataChannel.` 
            : 'Waiting for peers in this workspace...'}
        </p>
      </div>
    </div>
  );
}
