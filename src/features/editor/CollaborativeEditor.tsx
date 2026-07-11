import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Loader2, Eye } from 'lucide-react';
import { PeerManager } from '../../core/networking/PeerManager';
import { WorkspaceChat } from '../chat/WorkspaceChat';
import type * as awarenessProtocol from 'y-protocols/awareness';
import type { MemberRole } from '../../core/storage/db';
import { syncMembersToYjs, observeMembersFromYjs } from '../../core/members/memberService';

interface CollaborativeEditorProps {
  documentId: string;
  workspaceId: string;
  deviceId: string;
  activeWorkspaceKey: CryptoKey | null;
  myRole: MemberRole;
  onPeersChange: (count: number) => void;
  onAwarenessReady: (awareness: awarenessProtocol.Awareness | null) => void;
  onYdocReady: (ydoc: Y.Doc | null) => void;
}

export function CollaborativeEditor({ documentId, workspaceId, deviceId, activeWorkspaceKey, myRole, onPeersChange, onAwarenessReady, onYdocReady }: CollaborativeEditorProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const providerRef = useRef<IndexeddbPersistence | null>(null);
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const peerManagerRef = useRef<PeerManager | null>(null);

  const isReadOnly = myRole === 'viewer';
  const cursorColor = useRef(['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 5)]).current;

  useEffect(() => {
    setIsLoaded(false);
    onPeersChange(0);
    onYdocReady(null);
    ydocRef.current = new Y.Doc();

    const roomName = `localmesh-doc-${documentId}`;
    const provider = new IndexeddbPersistence(roomName, ydocRef.current);
    providerRef.current = provider;

    let unobserveMembers: (() => void) | null = null;

    provider.on('synced', () => {
      setIsLoaded(true);
      onYdocReady(ydocRef.current);

      // Sync members roster
      syncMembersToYjs(workspaceId, ydocRef.current).catch(() => {});
      unobserveMembers = observeMembersFromYjs(workspaceId, ydocRef.current);

      const pm = new PeerManager(deviceId, workspaceId, ydocRef.current, activeWorkspaceKey);

      pm.onPeerConnect = () => { onPeersChange(pm.getConnectedPeerCount()); };
      pm.onPeerDisconnect = () => { onPeersChange(pm.getConnectedPeerCount()); };

      pm.awareness.setLocalStateField('user', {
        name: deviceId.split('-')[0],
        color: cursorColor,
        role: myRole,
      });

      peerManagerRef.current = pm;
      onAwarenessReady(pm.awareness);
    });

    return () => {
      unobserveMembers?.();
      peerManagerRef.current?.destroy();
      provider.destroy();
      ydocRef.current.destroy();
      onPeersChange(0);
      onAwarenessReady(null);
      onYdocReady(null);
    };
  }, [documentId, workspaceId, deviceId, onPeersChange, onAwarenessReady, onYdocReady, cursorColor]);

  // Keep editor editable flag in sync with role changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [isReadOnly]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false } as any),
      Collaboration.configure({ document: ydocRef.current }),
    ],
    content: '',
    editable: !isReadOnly,
  }, [documentId, isLoaded]);

  if (!isLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={24} style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
        Loading document from local storage...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '0.75rem 2rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'var(--bg-panel)'
        }}>
          {isReadOnly ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.25)', padding: '0.35rem 0.875rem', borderRadius: '20px' }}>
              <Eye size={13} /> Read-only — Viewer access
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}><strong>B</strong></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}><em>I</em></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')}><s>S</s></ToolBtn>
              <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })}>H1</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>H2</ToolBtn>
              <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>• List</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>1. List</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')}>&lt;/&gt;</ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')}>"</ToolBtn>
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {/* Role pill */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '10px', background: myRole === 'owner' ? 'rgba(245,158,11,0.12)' : myRole === 'admin' ? 'rgba(99,102,241,0.1)' : myRole === 'viewer' ? 'rgba(148,163,184,0.1)' : 'rgba(16,185,129,0.1)', color: myRole === 'owner' ? '#f59e0b' : myRole === 'admin' ? '#6366f1' : myRole === 'viewer' ? '#94a3b8' : '#10b981', fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase' }}>
              {myRole}
            </span>
            <span>Saved locally</span>
          </div>
        </div>

        {/* Viewer banner */}
        {isReadOnly && (
          <div style={{ padding: '0.5rem 2rem', background: 'rgba(148,163,184,0.08)', borderBottom: '1px solid rgba(148,163,184,0.15)', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={13} />
            You have <strong>read-only</strong> access to this document. Contact the workspace admin to request edit permissions.
          </div>
        )}

        {/* Editor content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 4rem' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <WorkspaceChat ydoc={ydocRef.current} deviceId={deviceId} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ProseMirror { outline: none; min-height: 300px; }
        .ProseMirror p { margin: 0.5em 0; line-height: 1.75; }
        .ProseMirror h1 { font-size: 2rem; font-weight: 800; margin: 1.5rem 0 0.75rem; }
        .ProseMirror h2 { font-size: 1.4rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
        .ProseMirror blockquote { border-left: 3px solid var(--accent-primary); padding-left: 1rem; color: var(--text-secondary); margin: 1rem 0; }
        .ProseMirror code { background: rgba(99,102,241,0.1); padding: 1px 5px; border-radius: 4px; font-size: 0.88em; }
        .ProseMirror pre { background: var(--bg-sidebar); border-radius: 8px; padding: 1rem; overflow-x: auto; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; }
      `}</style>
    </div>
  );
}

// Toolbar button helper
function ToolBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean | null }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(99,102,241,0.12)' : 'none',
        border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
        color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
        padding: '0.3rem 0.625rem',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontWeight: active ? 700 : 400,
        transition: 'all 0.15s',
        minWidth: '32px',
      }}
    >
      {children}
    </button>
  );
}
