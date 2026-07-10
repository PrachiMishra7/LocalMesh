import React, { useEffect, useState } from 'react';
import { getOrCreateDeviceId } from '../core/identity/identityService';
import { Sidebar } from '../components/Sidebar';
import { EditorPlaceholder, SyncDashboard } from '../components/LayoutComponents';
import './App.css'; // Add basic resets

export default function App() {
  const [deviceId, setDeviceId] = useState<string>('Loading...');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [activeWorkspaceKey, setActiveWorkspaceKey] = useState<CryptoKey | null>(null);
  const [activePeers, setActivePeers] = useState<number>(0);

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

  const handleWorkspaceSelect = async (wsId: string, hasPassword?: boolean, salt?: string) => {
    setActiveWorkspaceId(wsId);
    setActiveDocumentId(null);
    setActiveWorkspaceKey(null);

    if (hasPassword && salt) {
      const pwd = prompt('This Workspace is encrypted. Enter the Workspace Password to unlock it:');
      if (pwd) {
        try {
          const { deriveKeyFromPassword } = await import('../core/security/crypto');
          const key = await deriveKeyFromPassword(pwd, salt);
          setActiveWorkspaceKey(key);
        } catch (e) {
          alert('Failed to derive encryption key.');
        }
      } else {
        alert('Password required to read or write to this workspace.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar 
        deviceId={deviceId}
        activeWorkspaceId={activeWorkspaceId}
        setActiveWorkspaceId={handleWorkspaceSelect}
        activeDocumentId={activeDocumentId}
        setActiveDocumentId={setActiveDocumentId}
      />
      <EditorPlaceholder 
        activeDocumentId={activeDocumentId} 
        deviceId={deviceId}
        activeWorkspaceId={activeWorkspaceId}
        activeWorkspaceKey={activeWorkspaceKey}
        onPeersChange={setActivePeers}
      />
      <SyncDashboard deviceId={deviceId} activePeers={activePeers} isEncrypted={!!activeWorkspaceKey} />
    </div>
  );
}
