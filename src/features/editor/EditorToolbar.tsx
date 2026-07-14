import { type Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ListChecks,
  Link, Image as ImageIcon, Table2, Minus,
  Code, Quote, Undo2, Redo2,
  Type, Eye, Download,
  Palette, Highlighter
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { MemberRole } from '../../core/storage/db';

interface EditorToolbarProps {
  editor: Editor | null;
  myRole: MemberRole;
  wordCount: number;
  charCount: number;
}

// ─── Color palettes ────────────────────────────────────────────────────────────
const TEXT_COLORS = [
  '#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#ffffff',
  '#ff0000','#ff4e00','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff',
  '#9900ff','#ff00ff','#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6fa8dc',
  '#8e7cc3','#c27ba0',
];
const HIGHLIGHT_COLORS = [
  '#ffff00','#00ffff','#ff69b4','#90ee90','#ffa500','#ff6347','#add8e6','#dda0dd',
  'transparent',
];
const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
];
const FONT_SIZES = ['10','11','12','14','16','18','20','24','28','32','36','48','60','72'];
const HEADING_OPTIONS = [
  { label: 'Normal text', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)', margin: '0 6px', flexShrink: 0 }} />;
}

function ToolBtn({
  onClick, active, title, children, disabled = false
}: {
  onClick: () => void; active?: boolean | null; title?: string;
  children: React.ReactNode; disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: active ? 'rgba(99,102,241,0.14)' : hover ? 'rgba(99,102,241,0.07)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-primary)' : hover ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
        color: active ? 'var(--accent-primary)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        padding: '4px 6px',
        borderRadius: '5px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '0.78rem',
        fontWeight: active ? 700 : 400,
        transition: 'all 0.12s',
        minWidth: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

// Generic dropdown wrapper
function DropdownBtn({
  label, title, children, minWidth = 180
}: {
  label: React.ReactNode; title?: string; children: React.ReactNode; minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }} onBlur={handleBlur} tabIndex={-1}>
      <button
        title={title}
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'rgba(99,102,241,0.07)' : 'transparent',
          border: `1px solid ${open ? 'rgba(99,102,241,0.3)' : 'var(--border-subtle)'}`,
          color: 'var(--text-secondary)',
          padding: '3px 8px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '0.78rem',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: 0.5 }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '32px', left: 0, zIndex: 1000,
          background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: '8px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(16px)', minWidth, overflow: 'hidden'
        }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// Color picker grid
function ColorGrid({ colors, onPick, title }: { colors: string[]; onPick: (c: string) => void; title?: string }) {
  return (
    <div style={{ padding: '0.5rem', minWidth: 180 }} title={title}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {colors.map(c => (
          <button
            key={c}
            onClick={() => onPick(c)}
            title={c}
            style={{
              width: '20px', height: '20px', borderRadius: '4px',
              background: c === 'transparent' ? 'linear-gradient(135deg, #fff 40%, #f00 40%)' : c,
              border: '1.5px solid rgba(0,0,0,0.15)',
              cursor: 'pointer', flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────
export function EditorToolbar({ editor, myRole, wordCount, charCount }: EditorToolbarProps) {
  const isReadOnly = myRole === 'viewer';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentHeading = HEADING_OPTIONS.find(h => {
    if (h.value === 'paragraph') return editor?.isActive('paragraph') && !editor?.isActive('heading');
    const level = parseInt(h.value.replace('h', ''));
    return editor?.isActive('heading', { level });
  }) || HEADING_OPTIONS[0];

  const setHeading = (value: string) => {
    if (!editor) return;
    if (value === 'paragraph') { editor.chain().focus().setParagraph().run(); return; }
    const level = parseInt(value.replace('h', '')) as 1|2|3|4;
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      editor?.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  };

  const handleLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
  };

  const handleTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  if (isReadOnly) {
    return (
      <div className="editor-toolbar" style={{
        padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: '1rem',
        background: 'var(--bg-panel)', minHeight: '46px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.25)', padding: '0.3rem 0.875rem', borderRadius: '20px' }}>
          <Eye size={13} /> Read-only — Viewer access
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <WordCountBadge wordCount={wordCount} charCount={charCount} />
          <RolePill myRole={myRole} />
        </div>
      </div>
    );
  }

  return (
    <div className="editor-toolbar" style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-panel)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Row 1: History + Heading + Font + Size + Colors + Alignment + Export */}
      <div style={{
        padding: '0.4rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flexWrap: 'wrap',
        borderBottom: '1px solid rgba(99,102,241,0.06)',
        minHeight: '42px'
      }}>
        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor?.chain().focus().undo().run()} title="Undo (Ctrl+Z)" disabled={!editor?.can().undo()}>
          <Undo2 size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().redo().run()} title="Redo (Ctrl+Y)" disabled={!editor?.can().redo()}>
          <Redo2 size={14} />
        </ToolBtn>

        <Divider />

        {/* Heading / Style */}
        <DropdownBtn label={<><Type size={12} style={{ marginRight: 4 }} />{currentHeading.label}</>} title="Text style" minWidth={160}>
          {HEADING_OPTIONS.map(h => (
            <button key={h.value} onClick={() => setHeading(h.value)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.875rem',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
              fontWeight: h.value === currentHeading.value ? 700 : 400,
              fontSize: h.value === 'paragraph' ? '0.85rem' : h.value === 'h1' ? '1.2rem' : h.value === 'h2' ? '1rem' : h.value === 'h3' ? '0.92rem' : '0.85rem',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              {h.label}
            </button>
          ))}
        </DropdownBtn>

        <Divider />

        {/* Font family */}
        <DropdownBtn label={<span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.78rem' }}>Font</span>} title="Font family" minWidth={180}>
          {FONT_FAMILIES.map(f => (
            <button key={f.value} onClick={() => {
              if (f.value === '') editor?.chain().focus().unsetFontFamily().run();
              else editor?.chain().focus().setFontFamily(f.value).run();
            }} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '0.45rem 0.875rem',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
              fontFamily: f.value || 'inherit', fontSize: '0.85rem',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              {f.label}
            </button>
          ))}
        </DropdownBtn>

        {/* Font size */}
        <DropdownBtn label={<span style={{ fontSize: '0.78rem' }}>Size</span>} title="Font size" minWidth={80}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxHeight: 260, overflowY: 'auto' }}>
            {FONT_SIZES.map(s => (
              <button key={s} onClick={() => editor?.chain().focus().setMark('textStyle', { fontSize: s + 'px' }).run()} style={{
                padding: '0.4rem 0.6rem', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.8rem', textAlign: 'center',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                {s}
              </button>
            ))}
          </div>
        </DropdownBtn>

        <Divider />

        {/* Text color */}
        <DropdownBtn label={<><Palette size={13} /></>} title="Text color" minWidth={170}>
          <ColorGrid colors={TEXT_COLORS} onPick={c => editor?.chain().focus().setColor(c).run()} />
          <div style={{ padding: '0 0.5rem 0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
            <button onClick={() => editor?.chain().focus().unsetColor().run()} style={{ width: '100%', padding: '0.35rem', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Reset Color
            </button>
          </div>
        </DropdownBtn>

        {/* Highlight */}
        <DropdownBtn label={<><Highlighter size={13} /></>} title="Highlight color" minWidth={160}>
          <ColorGrid colors={HIGHLIGHT_COLORS} onPick={c => {
            if (c === 'transparent') editor?.chain().focus().unsetHighlight().run();
            else editor?.chain().focus().setHighlight({ color: c }).run();
          }} />
        </DropdownBtn>

        <Divider />

        {/* Alignment */}
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })} title="Align left">
          <AlignLeft size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="Align center">
          <AlignCenter size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} title="Align right">
          <AlignRight size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('justify').run()} active={editor?.isActive({ textAlign: 'justify' })} title="Justify">
          <AlignJustify size={14} />
        </ToolBtn>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right: word count + role + export */}
        <WordCountBadge wordCount={wordCount} charCount={charCount} />
        <RolePill myRole={myRole} />
        <button
          onClick={() => window.print()}
          title="Export as PDF"
          style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s', flexShrink: 0 }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          <Download size={11} /> Export PDF
        </button>
      </div>

      {/* Row 2: Inline Format + Lists + Insert */}
      <div style={{
        padding: '0.35rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flexWrap: 'wrap',
        minHeight: '40px'
      }}>
        {/* Inline format */}
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold (Ctrl+B)">
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic (Ctrl+I)">
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline (Ctrl+U)">
          <Underline size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title="Strikethrough">
          <Strikethrough size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleSubscript().run()} active={editor?.isActive('subscript')} title="Subscript">
          <Subscript size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleSuperscript().run()} active={editor?.isActive('superscript')} title="Superscript">
          <Superscript size={14} />
        </ToolBtn>

        <Divider />

        {/* Lists */}
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
          <List size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
          <ListOrdered size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive('taskList')} title="Task list (checklist)">
          <ListChecks size={14} />
        </ToolBtn>

        <Divider />

        {/* Code & Quote */}
        <ToolBtn onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} title="Inline code">
          <Code size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')} title="Code block">
          <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>&lt;/&gt;</span>
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title="Blockquote">
          <Quote size={14} />
        </ToolBtn>

        <Divider />

        {/* Insert */}
        <ToolBtn onClick={handleLink} active={editor?.isActive('link')} title="Insert / edit link">
          <Link size={14} />
        </ToolBtn>

        <ToolBtn onClick={() => fileInputRef.current?.click()} title="Insert image">
          <ImageIcon size={14} />
        </ToolBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
        />

        <ToolBtn onClick={handleTable} title="Insert table">
          <Table2 size={14} />
        </ToolBtn>

        <ToolBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus size={14} />
        </ToolBtn>

        {/* Table controls (only when cursor is in table) */}
        {editor?.isActive('table') && (
          <>
            <Divider />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Table:</span>
            <ToolBtn onClick={() => editor?.chain().focus().addRowAfter().run()} title="Add row below">
              <span style={{ fontSize: '0.68rem' }}>+Row</span>
            </ToolBtn>
            <ToolBtn onClick={() => editor?.chain().focus().addColumnAfter().run()} title="Add column right">
              <span style={{ fontSize: '0.68rem' }}>+Col</span>
            </ToolBtn>
            <ToolBtn onClick={() => editor?.chain().focus().deleteRow().run()} title="Delete row">
              <span style={{ fontSize: '0.68rem', color: '#ef4444' }}>-Row</span>
            </ToolBtn>
            <ToolBtn onClick={() => editor?.chain().focus().deleteColumn().run()} title="Delete column">
              <span style={{ fontSize: '0.68rem', color: '#ef4444' }}>-Col</span>
            </ToolBtn>
            <ToolBtn onClick={() => editor?.chain().focus().deleteTable().run()} title="Delete table">
              <span style={{ fontSize: '0.68rem', color: '#ef4444' }}>Del Table</span>
            </ToolBtn>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────
function WordCountBadge({ wordCount, charCount }: { wordCount: number; charCount: number }) {
  return (
    <div title={`${charCount} characters`} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
      {wordCount.toLocaleString()} words
    </div>
  );
}

function RolePill({ myRole }: { myRole: MemberRole }) {
  const roleColors: Record<string, { bg: string; color: string }> = {
    owner:  { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
    admin:  { bg: 'rgba(99,102,241,0.10)',  color: '#6366f1' },
    member: { bg: 'rgba(16,185,129,0.10)',  color: '#10b981' },
    viewer: { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8' },
  };
  const c = roleColors[myRole] || roleColors.member;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '10px', background: c.bg, color: c.color, fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase', flexShrink: 0 }}>
      {myRole}
    </span>
  );
}
