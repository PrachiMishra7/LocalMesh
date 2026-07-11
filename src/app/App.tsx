import { useEffect, useState } from 'react';
import * as awarenessProtocol from 'y-protocols/awareness';
import type * as Y from 'yjs';
import { getOrCreateDeviceId } from '../core/identity/identityService';
import { Sidebar } from '../components/Sidebar';
import { EditorPlaceholder, SyncDashboard } from '../components/LayoutComponents';
import { AdminPanel } from '../components/AdminPanel';
import { getMyRole } from '../core/members/memberService';
import type { MemberRole } from '../core/storage/db';
import './App.css'; // Add basic resets

export default function App() {
  const [deviceId, setDeviceId] = useState<string>('Loading...');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [activeWorkspaceKey, setActiveWorkspaceKey] = useState<CryptoKey | null>(null);
  const [activeWorkspaceSalt, setActiveWorkspaceSalt] = useState<string | null>(null);
  const [activePeers, setActivePeers] = useState<number>(0);
  const [awareness, setAwareness] = useState<awarenessProtocol.Awareness | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [myRole, setMyRole] = useState<MemberRole>('member');
  const [activeYdoc, setActiveYdoc] = useState<Y.Doc | null>(null);

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
    setActiveWorkspaceSalt(salt || null);
    setAwareness(null);
    setActiveYdoc(null);

    // Load current user's role for this workspace
    const id = await getOrCreateDeviceId();
    const role = await getMyRole(wsId, id);
    setMyRole(role);

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
        myRole={myRole}
        onPeersChange={setActivePeers}
        onAwarenessReady={setAwareness}
        onYdocReady={setActiveYdoc}
      />
      <SyncDashboard
        deviceId={deviceId}
        activePeers={activePeers}
        isEncrypted={!!activeWorkspaceKey}
        awareness={awareness}
        activeWorkspaceId={activeWorkspaceId}
        activeWorkspaceSalt={activeWorkspaceSalt}
        onOpenAdmin={() => setShowAdmin(true)}
      />
      {showAdmin && activeWorkspaceId && (
        <AdminPanel
          workspaceId={activeWorkspaceId}
          deviceId={deviceId}
          myRole={myRole}
          awareness={awareness}
          ydoc={activeYdoc}
          onClose={() => setShowAdmin(false)}
          onWorkspaceDeleted={() => { setShowAdmin(false); setActiveWorkspaceId(null); setActiveDocumentId(null); }}
          onWorkspaceRenamed={() => {}}
          onKeyRotated={(newSalt) => { setActiveWorkspaceSalt(newSalt); }}
        />
      )}
    </div>
  );
}
