import React from 'react';
import { Network, Monitor } from 'lucide-react';

export function EditorPlaceholder({ activeDocumentId }: { activeDocumentId: string | null }) {
  if (!activeDocumentId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        <p>Select or create a document to start editing.</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ marginBottom: '1rem', color: '#333' }}>Editing Document: {activeDocumentId}</h2>
      <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', backgroundColor: '#fff' }}>
        <p style={{ color: '#666', fontStyle: 'italic' }}>
          CRDT Editor placeholder. This will be replaced by Tiptap + Yjs in Phase 9.
        </p>
      </div>
    </div>
  );
}

export function SyncDashboard({ deviceId }: { deviceId: string }) {
  return (
    <div style={{ width: '250px', backgroundColor: '#f8f9fa', borderLeft: '1px solid #eee', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Network size={16} /> Sync Status
      </h3>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.2rem' }}>Local Device ID</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', wordBreak: 'break-all', backgroundColor: '#eee', padding: '0.5rem', borderRadius: '4px' }}>
          <Monitor size={14} /> {deviceId}
        </div>
      </div>
      
      <div>
        <p style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.2rem' }}>Peers</p>
        <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Offline Mode (No peers connected)</p>
      </div>
    </div>
  );
}
