import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { Send, MessageSquare } from 'lucide-react';
import type { ChatMessage } from '../../core/protocol/messages';
import { v4 as uuidv4 } from 'uuid';

interface WorkspaceChatProps {
  ydoc: Y.Doc;
  deviceId: string;
}

export function WorkspaceChat({ ydoc, deviceId }: WorkspaceChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Access the shared chat array in the Y.Doc
    const ychat = ydoc.getArray<ChatMessage>('chat');

    const updateMessages = () => {
      setMessages(ychat.toArray());
    };

    // Observe changes from local input or remote peers
    ychat.observe(updateMessages);
    
    // Initial load
    updateMessages();

    return () => {
      ychat.unobserve(updateMessages);
    };
  }, [ydoc]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const ychat = ydoc.getArray<ChatMessage>('chat');
    
    const newMsg: ChatMessage = {
      type: 'CHAT_MESSAGE',
      id: uuidv4(),
      content: input.trim(),
      authorId: deviceId,
      timestamp: Date.now()
    };

    // Pushing to the Y.Array automatically syncs it via our PeerManager's DataChannel!
    ychat.push([newMsg]);
    setInput('');
  };

  return (
    <div style={{
      width: '320px',
      borderLeft: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-panel)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: 'var(--bg-sidebar)'
      }}>
        <MessageSquare size={16} color="var(--accent-primary)" />
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Document Chat
        </h3>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center' }}>
            No messages yet. Say hello to your peers!
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.authorId === deviceId;
            return (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start'
              }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem', padding: '0 4px' }}>
                  {isMe ? 'You' : msg.authorId.split('-')[0]} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: '12px',
                  backgroundColor: isMe ? 'var(--accent-primary)' : 'rgba(0,0,0,0.05)',
                  border: isMe ? 'none' : '1px solid var(--border-subtle)',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  fontSize: '0.85rem',
                  maxWidth: '85%',
                  lineHeight: '1.4',
                  boxShadow: isMe ? '0 2px 4px rgba(79, 70, 229, 0.2)' : 'none',
                  borderBottomRightRadius: isMe ? '2px' : '12px',
                  borderBottomLeftRadius: isMe ? '12px' : '2px'
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-sidebar)',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button 
          type="submit"
          disabled={!input.trim()}
          style={{
            background: input.trim() ? 'var(--accent-primary)' : 'var(--border-active)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0 0.8rem',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
