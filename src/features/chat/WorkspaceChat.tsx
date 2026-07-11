import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { Send, MessageSquare, Search, X, Reply, Edit2, Trash2, Smile, Copy, Check, MoreHorizontal, Paperclip, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage } from '../../core/protocol/messages';
import { v4 as uuidv4 } from 'uuid';

interface WorkspaceChatProps {
  ydoc: Y.Doc;
  deviceId: string;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// Determine a stable color for a peer based on their ID
function peerColor(id: string): string {
  const palette = ['#6366f1','#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6','#ef4444','#14b8a6'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSep(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function WorkspaceChat({ ydoc, deviceId }: WorkspaceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [typingPeers, setTypingPeers] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<ChatMessage['attachment']>(undefined);
  
  // Rate limiting state
  const [sentTimestamps, setSentTimestamps] = useState<number[]>([]);
  const [rateLimited, setRateLimited] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yTypingRef = useRef<Y.Map<number> | null>(null);

  // ── Yjs observe ────────────────────────────────────────────────────────────
  useEffect(() => {
    const ychat = ydoc.getArray<ChatMessage>('chat');
    const ytyping = ydoc.getMap<number>('typing');
    yTypingRef.current = ytyping;

    const updateMessages = () => setMessages(ychat.toArray());
    const updateTyping = () => {
      const now = Date.now();
      const active = Array.from(ytyping.keys()).filter(k => k !== deviceId && (ytyping.get(k) ?? 0) > now - 4000);
      setTypingPeers(active.map(k => k.split('-')[0]));
    };

    ychat.observe(updateMessages);
    ytyping.observe(updateTyping);
    updateMessages();

    const interval = setInterval(updateTyping, 1500);
    return () => {
      ychat.unobserve(updateMessages);
      ytyping.unobserve(updateTyping);
      clearInterval(interval);
    };
  }, [ydoc, deviceId]);

  // ── Auto scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!search) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, search]);

  // ── Close context menu on outside click ─────────────────────────────────────
  useEffect(() => {
    const close = () => { setContextMenu(null); setShowEmojiFor(null); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // ── Typing indicator ────────────────────────────────────────────────────────
  const handleTyping = useCallback(() => {
    if (yTypingRef.current) {
      yTypingRef.current.set(deviceId, Date.now());
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      yTypingRef.current?.delete(deviceId);
    }, 3500);
  }, [deviceId]);

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || rateLimited) return;

    // Rate limiting: max 5 messages per 10 seconds
    const now = Date.now();
    const recentSends = sentTimestamps.filter(t => now - t < 10000);
    if (recentSends.length >= 5) {
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), 5000); // cooldown for 5 seconds
      return;
    }
    setSentTimestamps([...recentSends, now]);

    const ychat = ydoc.getArray<ChatMessage>('chat');
    ychat.push([{
      type: 'CHAT_MESSAGE',
      id: uuidv4(),
      content: input.trim(),
      authorId: deviceId,
      timestamp: Date.now(),
      attachment: attachment,
      ...(replyTo ? { replyToId: replyTo.id } : {})
    }]);

    setInput('');
    setAttachment(undefined);
    setReplyTo(null);
    yTypingRef.current?.delete(deviceId);
    inputRef.current?.focus();
  };

  // ── Attach Image ────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > MAX_DIM) {
          height *= MAX_DIM / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width *= MAX_DIM / height;
          height = MAX_DIM;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setAttachment({
          type: 'image',
          data: dataUrl,
          name: file.name,
          width,
          height
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const handleEdit = (msg: ChatMessage) => {
    const ychat = ydoc.getArray<ChatMessage>('chat');
    const idx = ychat.toArray().findIndex(m => m.id === msg.id);
    if (idx === -1) return;
    ychat.delete(idx, 1);
    ychat.insert(idx, [{ ...msg, content: editInput.trim(), editedAt: Date.now() }]);
    setEditingId(null);
    setEditInput('');
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = (msgId: string) => {
    const ychat = ydoc.getArray<ChatMessage>('chat');
    const arr = ychat.toArray();
    const idx = arr.findIndex(m => m.id === msgId);
    if (idx === -1) return;
    const msg = arr[idx];
    ychat.delete(idx, 1);
    ychat.insert(idx, [{ ...msg, deletedAt: Date.now(), content: '' }]);
    setContextMenu(null);
  };

  // ── React ────────────────────────────────────────────────────────────────────
  const handleReact = (msgId: string, emoji: string) => {
    const ychat = ydoc.getArray<ChatMessage>('chat');
    const arr = ychat.toArray();
    const idx = arr.findIndex(m => m.id === msgId);
    if (idx === -1) return;
    const msg = { ...arr[idx] };
    const reactions = { ...(msg.reactions || {}) };
    const existing = reactions[emoji] || [];
    if (existing.includes(deviceId)) {
      reactions[emoji] = existing.filter(id => id !== deviceId);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...existing, deviceId];
    }
    msg.reactions = reactions;
    ychat.delete(idx, 1);
    ychat.insert(idx, [msg]);
    setShowEmojiFor(null);
  };

  // ── Copy ─────────────────────────────────────────────────────────────────────
  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    setContextMenu(null);
  };

  // ── Filter messages ──────────────────────────────────────────────────────────
  const filtered = search
    ? messages.filter(m => !m.deletedAt && m.content.toLowerCase().includes(search.toLowerCase()))
    : messages;

  // ── Date separators ───────────────────────────────────────────────────────────
  const withSeparators: Array<{ type: 'msg'; msg: ChatMessage } | { type: 'sep'; label: string; key: string }> = [];
  let lastDate = '';
  for (const msg of filtered) {
    const dateLabel = formatDateSep(msg.timestamp);
    if (dateLabel !== lastDate) {
      withSeparators.push({ type: 'sep', label: dateLabel, key: `sep-${msg.id}` });
      lastDate = dateLabel;
    }
    withSeparators.push({ type: 'msg', msg });
  }

  return (
    <div className="workspace-chat" style={{ width: '320px', borderLeft: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: 'var(--bg-sidebar)', flexShrink: 0 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageSquare size={15} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Chat</h3>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
            {typingPeers.length > 0 ? `${typingPeers.join(', ')} typing...` : `${messages.filter(m => !m.deletedAt).length} messages`}
          </p>
        </div>
        <button onClick={() => { setShowSearch(v => !v); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: showSearch ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '4px', borderRadius: '6px', display: 'flex' }}>
          <Search size={15} />
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-sidebar)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages..."
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '0.82rem', color: 'var(--text-primary)' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}><X size={13} /></button>}
          </div>
          {search && <p style={{ margin: '0.3rem 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>}
        </div>
      )}

      {/* Message List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.75rem 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {withSeparators.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', gap: '0.5rem', padding: '2rem' }}>
            <MessageSquare size={32} style={{ opacity: 0.25 }} />
            <span>{search ? 'No messages found' : 'No messages yet.\nSay hello to your peers! 👋'}</span>
          </div>
        )}

        {withSeparators.map(item => {
          if (item.type === 'sep') {
            return (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-panel)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{item.label}</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              </div>
            );
          }

          const msg = item.msg;
          const isMe = msg.authorId === deviceId;
          const isDeleted = !!msg.deletedAt;
          const replyMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
          const authorColor = peerColor(msg.authorId);
          const authorName = isMe ? 'You' : msg.authorId.split('-')[0];

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: '2px' }}>
              {/* Author name (for group, non-self) */}
              {!isMe && !isDeleted && (
                <span style={{ fontSize: '0.62rem', color: authorColor, fontWeight: 700, marginBottom: '2px', paddingLeft: '4px' }}>{authorName}</span>
              )}

              <div style={{ position: 'relative', maxWidth: '85%' }}>
                {/* Context menu trigger on hover */}
                {!isDeleted && (
                  <div
                    className="msg-actions"
                    style={{
                      position: 'absolute', top: '2px', [isMe ? 'left' : 'right']: '-28px',
                      display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 5
                    }}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); setContextMenu({ id: msg.id, x: e.clientX, y: e.clientY }); }}
                      style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
                      className="msg-action-btn"
                    >
                      <MoreHorizontal size={11} color="var(--text-muted)" />
                    </button>
                  </div>
                )}

                {/* Reply preview */}
                {replyMsg && !isDeleted && (
                  <div style={{ background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--border-subtle)', borderLeft: `3px solid ${authorColor}`, borderRadius: '6px 6px 0 0', padding: '4px 8px', fontSize: '0.7rem', color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', marginBottom: '-4px' }}>
                    <strong>{replyMsg.authorId === deviceId ? 'You' : replyMsg.authorId.split('-')[0]}</strong>: {replyMsg.deletedAt ? '🚫 Deleted' : replyMsg.content.slice(0, 60)}{replyMsg.content.length > 60 ? '...' : ''}
                  </div>
                )}

                {/* Bubble */}
                {editingId === msg.id ? (
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-sidebar)', border: '1.5px solid var(--accent-primary)', borderRadius: '12px', padding: '6px 8px', minWidth: '160px' }}>
                    <input
                      autoFocus
                      value={editInput}
                      onChange={e => setEditInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEdit(msg); if (e.key === 'Escape') setEditingId(null); }}
                      style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                    />
                    <button onClick={() => handleEdit(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex' }}>
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: isDeleted ? '0.5rem 0.875rem' : '0.55rem 0.875rem',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      backgroundColor: isDeleted ? 'transparent' : isMe ? 'var(--accent-primary)' : 'var(--bg-sidebar)',
                      border: isDeleted ? '1px dashed var(--border-subtle)' : isMe ? 'none' : '1px solid var(--border-subtle)',
                      color: isDeleted ? 'var(--text-muted)' : isMe ? '#fff' : 'var(--text-primary)',
                      fontSize: '0.85rem',
                      lineHeight: '1.45',
                      boxShadow: isMe && !isDeleted ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
                      fontStyle: isDeleted ? 'italic' : 'normal',
                      wordBreak: 'break-word',
                      overflowX: 'auto',
                    }}
                  >
                    {isDeleted ? '🚫 Message deleted' : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {msg.attachment && msg.attachment.type === 'image' && (
                          <img 
                            src={msg.attachment.data} 
                            alt={msg.attachment.name} 
                            style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }} 
                          />
                        )}
                        {msg.content && <MarkdownMessage content={msg.content} />}
                      </div>
                    )}
                  </div>
                )}

                {/* Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    {Object.entries(msg.reactions).map(([emoji, reactors]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(msg.id, emoji)}
                        style={{ background: reactors.includes(deviceId) ? 'rgba(99,102,241,0.15)' : 'var(--bg-sidebar)', border: `1px solid ${reactors.includes(deviceId) ? 'var(--accent-primary)' : 'var(--border-subtle)'}`, borderRadius: '20px', padding: '1px 7px', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-primary)' }}
                      >
                        {emoji} <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{reactors.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp + edited */}
              {!isDeleted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', paddingLeft: isMe ? 0 : '4px', paddingRight: isMe ? '4px' : 0 }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{formatTime(msg.timestamp)}</span>
                  {msg.editedAt && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>edited</span>}
                  {isMe && <Check size={10} color="rgba(99,102,241,0.6)" />}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingPeers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{typingPeers.join(', ')} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} style={{ paddingBottom: '0.5rem' }} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100,
            background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
            borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            minWidth: '160px', padding: '4px', overflow: 'hidden'
          }}
        >
          {(() => {
            const msg = messages.find(m => m.id === contextMenu.id);
            const isMe = msg?.authorId === deviceId;
            return (
              <>
                <CtxItem icon={<Reply size={13} />} label="Reply" onClick={() => { setReplyTo(msg!); setContextMenu(null); inputRef.current?.focus(); }} />
                <CtxItem icon={<Smile size={13} />} label="React" onClick={() => { setShowEmojiFor(contextMenu.id); setContextMenu(null); }} />
                <CtxItem icon={copiedId === contextMenu.id ? <Check size={13} /> : <Copy size={13} />} label="Copy" onClick={() => handleCopy(msg?.content || '', contextMenu.id)} />
                {isMe && <CtxItem icon={<Edit2 size={13} />} label="Edit" onClick={() => { setEditingId(contextMenu.id); setEditInput(msg?.content || ''); setContextMenu(null); }} />}
                {isMe && <CtxItem icon={<Trash2 size={13} />} label="Delete" danger onClick={() => handleDelete(contextMenu.id)} />}
              </>
            );
          })()}
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiFor && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '8px 12px', display: 'flex', gap: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
        >
          {EMOJI_REACTIONS.map(e => (
            <button key={e} onClick={() => handleReact(showEmojiFor, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', borderRadius: '8px', padding: '4px', transition: 'transform 0.1s' }} onMouseOver={ev => ev.currentTarget.style.transform = 'scale(1.3)'} onMouseOut={ev => ev.currentTarget.style.transform = 'scale(1)'}>{e}</button>
          ))}
        </div>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.06)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Reply size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Replying to {replyTo.authorId === deviceId ? 'yourself' : replyTo.authorId.split('-')[0]}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyTo.content || (replyTo.attachment ? `[Image ${replyTo.attachment.name}]` : '')}</p>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: 'var(--text-muted)' }}><X size={14} /></button>
        </div>
      )}

      {/* Attachment Preview */}
      {attachment && (
        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {attachment.type === 'image' ? (
              <img src={attachment.data} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <ImageIcon size={16} color="var(--text-muted)" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attachment.name}</p>
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>Image attached</p>
          </div>
          <button onClick={() => setAttachment(undefined)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: 'var(--text-muted)', borderRadius: '4px' }} onMouseOver={e => e.currentTarget.style.background='var(--border-subtle)'} onMouseOut={e => e.currentTarget.style.background='none'}><X size={14} /></button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: '0.75rem', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-sidebar)', display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0, position: 'relative' }}>
        {rateLimited && (
          <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: '#ef4444', background: 'var(--bg-panel)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            Sending too fast! Please wait.
          </div>
        )}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          style={{ display: 'none' }} 
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', flexShrink: 0, borderRadius: '6px' }}
          title="Attach image"
        >
          <Paperclip size={18} />
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); if (messages.length > 0) setShowEmojiFor(showEmojiFor ? null : 'quick'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex', flexShrink: 0, borderRadius: '6px' }}
        >
          <Smile size={18} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); handleTyping(); }}
          onKeyDown={e => { if (e.key === 'Escape') setReplyTo(null); }}
          placeholder={rateLimited ? "Rate limited..." : "Type a message..."}
          disabled={rateLimited}
          style={{ flex: 1, padding: '0.6rem 0.875rem', borderRadius: '20px', border: '1.5px solid var(--border-subtle)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', transition: 'border 0.2s', opacity: rateLimited ? 0.5 : 1 }}

          onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
        />
        <button
          type="submit"
          disabled={!input.trim() && !attachment}
          style={{ width: '36px', height: '36px', borderRadius: '50%', background: (input.trim() || attachment) ? 'var(--accent-primary)' : 'var(--border-subtle)', color: '#fff', border: 'none', cursor: (input.trim() || attachment) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: (input.trim() || attachment) ? '0 2px 8px rgba(99,102,241,0.35)' : 'none', transition: 'all 0.2s' }}
        >
          <Send size={15} style={{ marginLeft: '1px' }} />
        </button>
      </form>

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
        .msg-actions { visibility: hidden; }
        div:hover > div > .msg-actions { visibility: visible; }
        .msg-action-btn { opacity: 0 !important; }
        div:hover .msg-action-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

// ── Context menu item ──────────────────────────────────────────────────────────
function CtxItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', border: 'none', borderRadius: '7px', background: hovered ? (danger ? 'rgba(239,68,68,0.08)' : 'var(--border-subtle)') : 'none', cursor: 'pointer', color: danger ? '#ef4444' : 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 500, textAlign: 'left' }}
    >
      {icon} {label}
    </button>
  );
}

// ── Markdown renderer ────────────────────────────────────────────────────────
function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-chat">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                {...props}
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{ borderRadius: '6px', margin: '4px 0', padding: '8px', fontSize: '0.75rem' }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code {...props} className={className} style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'var(--mono)', fontSize: '0.85em' }}>
                {children}
              </code>
            );
          },
          p: ({ children }) => <p style={{ margin: 0, padding: 0 }}>{children}</p>,
          a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{children}</a>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
