import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Focus from '@tiptap/extension-focus';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Loader2, Eye } from 'lucide-react';
import { PeerManager } from '../../core/networking/PeerManager';
import { WorkspaceChat } from '../chat/WorkspaceChat';
import type * as awarenessProtocol from 'y-protocols/awareness';
import type { MemberRole } from '../../core/storage/db';
import { syncMembersToYjs, observeMembersFromYjs } from '../../core/members/memberService';
import { EditorToolbar } from './EditorToolbar';
import { EditorBubbleMenu } from './EditorBubbleMenu';

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

// Slash command menu items
const SLASH_ITEMS = [
  { label: '📝 Paragraph',    command: (editor: any) => editor.chain().focus().setParagraph().run() },
  { label: '# Heading 1',     command: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: '## Heading 2',    command: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: '### Heading 3',   command: (editor: any) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: '• Bullet List',   command: (editor: any) => editor.chain().focus().toggleBulletList().run() },
  { label: '1. Ordered List', command: (editor: any) => editor.chain().focus().toggleOrderedList().run() },
  { label: '☑ Task List',     command: (editor: any) => editor.chain().focus().toggleTaskList().run() },
  { label: '❝ Blockquote',    command: (editor: any) => editor.chain().focus().toggleBlockquote().run() },
  { label: '</> Code Block',  command: (editor: any) => editor.chain().focus().toggleCodeBlock().run() },
  { label: '― Divider',       command: (editor: any) => editor.chain().focus().setHorizontalRule().run() },
  { label: '⊞ Table',         command: (editor: any) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

export function CollaborativeEditor(props: CollaborativeEditorProps) {
  const { documentId, workspaceId, deviceId, activeWorkspaceKey, myRole, onPeersChange, onAwarenessReady, onYdocReady } = props;
  const [isLoaded, setIsLoaded] = useState(false);
  const [ydoc, setYdoc] = useState<Y.Doc>(() => new Y.Doc());
  const providerRef = useRef<IndexeddbPersistence | null>(null);
  const peerManagerRef = useRef<PeerManager | null>(null);

  const cursorColor = useRef(['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 5)]).current;

  useEffect(() => {
    setIsLoaded(false);
    onPeersChange(0);
    onYdocReady(null);
    const newYdoc = new Y.Doc();
    setYdoc(newYdoc);

    const roomName = `localmesh-doc-${documentId}`;
    const provider = new IndexeddbPersistence(roomName, newYdoc);
    providerRef.current = provider;

    let unobserveMembers: (() => void) | null = null;

    provider.on('synced', () => {
      setIsLoaded(true);
      onYdocReady(newYdoc);

      syncMembersToYjs(workspaceId, newYdoc).catch(() => {});
      unobserveMembers = observeMembersFromYjs(workspaceId, newYdoc);

      const pm = new PeerManager(deviceId, workspaceId, newYdoc, activeWorkspaceKey);

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
      peerManagerRef.current = null;
      provider.destroy();
      newYdoc.destroy();
      onPeersChange(0);
      onAwarenessReady(null);
      onYdocReady(null);
    };
  }, [documentId, workspaceId, deviceId, onPeersChange, onAwarenessReady, onYdocReady, cursorColor, myRole, activeWorkspaceKey]);

  if (!isLoaded || !peerManagerRef.current) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={24} style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
        Loading document from local storage...
      </div>
    );
  }

  return (
    <ActiveEditor
      {...props}
      ydoc={ydoc}
      peerManager={peerManagerRef.current}
      cursorColor={cursorColor}
    />
  );
}

function ActiveEditor({
  documentId, deviceId, myRole, ydoc, peerManager, cursorColor
}: CollaborativeEditorProps & { ydoc: Y.Doc; peerManager: PeerManager; cursorColor: string }) {
  const isReadOnly = myRole === 'viewer';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
        horizontalRule: false,
      } as any),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider: { awareness: peerManager.awareness } as any,
        user: { name: deviceId.split('-')[0], color: cursorColor },
      }),
      Underline, Subscript, Superscript, TextStyle, Color,
      Highlight.configure({ multicolor: true }), Typography,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      HorizontalRule,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }),
      CharacterCount,
      Placeholder.configure({ placeholder: 'Start writing, or type "/" for commands…' }),
      Focus.configure({ className: 'has-focus', mode: 'all' }),
    ],
    content: '',
    editable: !isReadOnly,
  }, [documentId, ydoc]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [isReadOnly, editor]);

  const wordCount = editor?.storage.characterCount?.words() ?? 0;
  const charCount = editor?.storage.characterCount?.characters() ?? 0;

  return (
    <div className="collaborative-editor-container" style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <EditorToolbar editor={editor} myRole={myRole} wordCount={wordCount} charCount={charCount} />

        {isReadOnly && (
          <div style={{ padding: '0.5rem 2rem', background: 'rgba(148,163,184,0.08)', borderBottom: '1px solid rgba(148,163,184,0.15)', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={13} />
            You have <strong>read-only</strong> access to this document. Contact the workspace admin to request edit permissions.
          </div>
        )}

        <div className="editor-scroll-area" style={{ flex: 1, overflowY: 'auto', background: 'var(--editor-bg)', padding: '2.5rem 1.5rem' }}>
          <div className="editor-page">
            {editor && !isReadOnly && <EditorBubbleMenu editor={editor} />}
            {editor && !isReadOnly && (
              <FloatingMenu
                editor={editor}
                tippyOptions={{ duration: 100, placement: 'bottom-start' }}
                shouldShow={({ state }) => {
                  const { $from } = state.selection;
                  return $from.parent.type.name === 'paragraph' && $from.parent.textContent === '/';
                }}
              >
                <div className="slash-menu">
                  <div className="slash-menu-title">Insert block</div>
                  {SLASH_ITEMS.map(item => (
                    <button
                      key={item.label}
                      className="slash-menu-item"
                      onMouseDown={e => {
                        e.preventDefault();
                        editor.chain().focus().deleteRange({
                          from: editor.state.selection.$from.start(),
                          to: editor.state.selection.$from.start() + 1,
                        }).run();
                        item.command(editor);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </FloatingMenu>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="editor-status-bar">
          <span>Saved locally</span>
          <span className="editor-status-separator">·</span>
          <span>{wordCount.toLocaleString()} words, {charCount.toLocaleString()} characters</span>
        </div>
      </div>
      <WorkspaceChat ydoc={ydoc} deviceId={deviceId} />
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
