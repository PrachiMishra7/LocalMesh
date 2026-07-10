import { CollaborativeEditor } from '../features/editor/CollaborativeEditor';

export function EditorPlaceholder({ activeDocumentId }: { activeDocumentId: string | null }) {
  if (!activeDocumentId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--bg-sidebar)', borderRadius: '16px', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <p>Select a document from the sidebar to start editing.</p>
        </div>
      </div>
    );
  }

  return <CollaborativeEditor documentId={activeDocumentId} />;
}

import { Network, Monitor } from 'lucide-react';

export function SyncDashboard({ deviceId }: { deviceId: string }) {
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
        <Network size={14} /> Network Status
      </h3>
      
      <div style={{ marginBottom: '1.5rem', background: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Connection</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }} />
            Offline Local
          </div>
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.4rem' }}>Device ID</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontFamily: 'var(--mono)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            <Monitor size={14} color="var(--accent-primary)" /> 
            {deviceId.split('-')[0]}...
          </div>
        </div>
      </div>
      
      <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>Active Peers (0)</p>
        <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}>
          WebRTC networking will be enabled in the next phase.
        </p>
      </div>
    </div>
  );
}
