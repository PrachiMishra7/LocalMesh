import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Loader2 } from 'lucide-react';
import { PeerManager } from '../../core/networking/PeerManager';

import { WorkspaceChat } from '../chat/WorkspaceChat';

interface CollaborativeEditorProps {
  documentId: string;
  workspaceId: string;
  deviceId: string;
  activeWorkspaceKey: CryptoKey | null;
  onPeersChange: (count: number) => void;
}

export function CollaborativeEditor({ documentId, workspaceId, deviceId, activeWorkspaceKey, onPeersChange }: CollaborativeEditorProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const providerRef = useRef<IndexeddbPersistence | null>(null);
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const peerManagerRef = useRef<PeerManager | null>(null);

  const cursorColor = useRef(['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 5)]).current;

  useEffect(() => {
    // Reset state for new document
    setIsLoaded(false);
    onPeersChange(0);
    ydocRef.current = new Y.Doc();

    // Initialize IndexedDB persistence for this Yjs Document
    const roomName = `localmesh-doc-${documentId}`;
    const provider = new IndexeddbPersistence(roomName, ydocRef.current);
    providerRef.current = provider;

    provider.on('synced', () => {
      setIsLoaded(true);
      
      // Once local state is loaded, spin up WebRTC networking
      const pm = new PeerManager(deviceId, workspaceId, ydocRef.current, activeWorkspaceKey);
      
      pm.onPeerConnect = () => {
        onPeersChange(pm.getConnectedPeerCount());
      };
      
      pm.onPeerDisconnect = () => {
        onPeersChange(pm.getConnectedPeerCount());
      };

      // Set our local awareness state (name and color)
      pm.awareness.setLocalStateField('user', {
        name: deviceId.split('-')[0], // Use short device ID as name
        color: cursorColor,
      });

      peerManagerRef.current = pm;
    });

    return () => {
      if (peerManagerRef.current) {
        peerManagerRef.current.destroy();
      }
      provider.destroy();
      ydocRef.current.destroy();
      onPeersChange(0);
    };
  }, [documentId, workspaceId, deviceId, onPeersChange, cursorColor]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, 
      } as any),
      Collaboration.configure({
        document: ydocRef.current,
      }),
    ],
    content: '',
  }, [documentId, isLoaded]);

  if (!isLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Loader2 className="animate-spin" size={24} style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} /> 
        Loading document from local storage...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ 
          padding: '1rem 2rem', 
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'var(--bg-panel)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => editor?.chain().focus().toggleBold().run()} style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>B</button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontStyle: 'italic' }}>I</button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>H1</button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>H2</button>
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} style={{ background: 'none', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}>List</button>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Saved locally
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 4rem' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      
      <WorkspaceChat ydoc={ydocRef.current} deviceId={deviceId} />
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
