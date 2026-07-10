import React, { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from '../core/identity/identityService';
import { Sidebar } from '../components/Sidebar';
import { EditorPlaceholder, SyncDashboard } from '../components/LayoutComponents';
import './App.css'; // Add basic resets

export default function App() {
  const [deviceId, setDeviceId] = useState<string>('Loading...');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const id = await getOrCreateDeviceId();
        setDeviceId(id);
      } catch (err) {
        console.error('Error loading device identity', err);
      }
    };
    init();
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar 
        deviceId={deviceId}
        activeWorkspaceId={activeWorkspaceId}
        setActiveWorkspaceId={setActiveWorkspaceId}
        activeDocumentId={activeDocumentId}
        setActiveDocumentId={setActiveDocumentId}
      />
      <EditorPlaceholder activeDocumentId={activeDocumentId} />
      <SyncDashboard deviceId={deviceId} />
    </div>
  );
}
