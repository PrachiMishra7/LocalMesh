import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Loader2 } from 'lucide-react';
import { PeerManager } from '../../core/networking/PeerManager';

interface CollaborativeEditorProps {
  documentId: string;
  workspaceId: string;
  deviceId: string;
  onPeersChange: (count: number) => void;
}

export function CollaborativeEditor({ documentId, workspaceId, deviceId, onPeersChange }: CollaborativeEditorProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const providerRef = useRef<IndexeddbPersistence | null>(null);
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const peerManagerRef = useRef<PeerManager | null>(null);

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
      const pm = new PeerManager(deviceId, workspaceId, ydocRef.current);
      
      pm.onPeerConnect = () => {
        onPeersChange(pm.getConnectedPeerCount());
      };
      
      pm.onPeerDisconnect = () => {
        onPeersChange(pm.getConnectedPeerCount());
      };

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
  }, [documentId, workspaceId, deviceId, onPeersChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The Collaboration extension handles history, so disable StarterKit's history
        history: false as any, 
      }),
      Collaboration.configure({
        document: ydocRef.current,
      }),
    ],
    // Empty content by default, Yjs will populate it
    content: '',
  }, [documentId]); // Recreate editor when documentId changes

  if (!isLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Loader2 className="animate-spin" size={24} style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} /> 
        Loading document from local storage...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ 
        padding: '1rem 2rem', 
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(255, 255, 255, 0.02)'
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
