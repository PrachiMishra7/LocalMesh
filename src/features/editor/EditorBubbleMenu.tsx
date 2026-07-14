import { BubbleMenu, type Editor } from '@tiptap/react';
import { Bold, Italic, Underline, Strikethrough, Link, Code } from 'lucide-react';
import { useState } from 'react';

interface EditorBubbleMenuProps {
  editor: Editor;
}

function BubbleBtn({
  onClick, active, title, children
}: {
  onClick: () => void; active?: boolean | null; title?: string; children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: active ? 'rgba(255,255,255,0.25)' : hover ? 'rgba(255,255,255,0.12)' : 'transparent',
        border: 'none',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.78)',
        padding: '5px 7px',
        borderRadius: '5px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: active ? 700 : 400,
        transition: 'all 0.1s',
        minWidth: '28px',
        height: '28px',
      }}
    >
      {children}
    </button>
  );
}

function BubbleDivider() {
  return <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.2)', margin: '0 3px', flexShrink: 0 }} />;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const handleLink = () => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: 'top',
        animation: 'shift-away',
      }}
      shouldShow={({ state, editor: e }) => {
        const { selection } = state;
        const { empty } = selection;
        // Only show bubble menu when there's a non-empty selection and we're not in code block
        return !empty && !e.isActive('codeBlock');
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1px',
        background: 'linear-gradient(135deg, #1e1e2e, #2d2d44)',
        border: '1px solid rgba(99,102,241,0.4)',
        borderRadius: '9px',
        padding: '4px 5px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.15)',
        backdropFilter: 'blur(20px)',
      }}>
        <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold size={13} />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic size={13} />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <Underline size={13} />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={13} />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
          <Code size={13} />
        </BubbleBtn>

        <BubbleDivider />

        <BubbleBtn onClick={handleLink} active={editor.isActive('link')} title={editor.isActive('link') ? 'Edit link' : 'Add link'}>
          <Link size={13} />
        </BubbleBtn>

        <BubbleDivider />

        {/* Quick highlight colors */}
        {['#ffff00','#90ee90','#87ceeb','#ffb6c1'].map(color => (
          <button
            key={color}
            onClick={() => editor.chain().focus().setHighlight({ color }).run()}
            title={`Highlight ${color}`}
            style={{
              width: '16px', height: '16px', borderRadius: '3px',
              background: color, border: '1.5px solid rgba(255,255,255,0.25)',
              cursor: 'pointer', flexShrink: 0,
            }}
          />
        ))}
        <button
          onClick={() => editor.chain().focus().unsetHighlight().run()}
          title="Remove highlight"
          style={{
            width: '16px', height: '16px', borderRadius: '3px',
            background: 'linear-gradient(135deg, white 40%, red 40%)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            cursor: 'pointer', flexShrink: 0,
          }}
        />
      </div>
    </BubbleMenu>
  );
}
