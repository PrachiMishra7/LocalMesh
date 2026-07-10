import { db } from '../core/storage/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { Folder, FileText, Plus, Hash, Settings, Users } from 'lucide-react';
import React from 'react';

interface SidebarProps {
  deviceId: string;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string, hasPassword?: boolean, salt?: string) => void;
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string) => void;
}

export function Sidebar({ 
  deviceId, 
  activeWorkspaceId, 
  setActiveWorkspaceId,
  activeDocumentId,
  setActiveDocumentId
}: SidebarProps) {
  
  const workspaces = useLiveQuery(() => db.workspaces.orderBy('createdAt').reverse().toArray());
  const documents = useLiveQuery(
    async () => {
      if (!activeWorkspaceId) return [];
      const docs = await db.documents.where('workspaceId').equals(activeWorkspaceId).toArray();
      return docs.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    [activeWorkspaceId]
  );

  const handleCreateWorkspace = async () => {
    const name = prompt('Enter Workspace Name (e.g., Engineering Team):');
    if (!name) return;
    
    const password = prompt('Enter an optional Workspace Password to enable End-to-End Encryption (leave blank for none):');
    
    const id = uuidv4();
    const ws: any = {
      id,
      name,
      createdAt: Date.now(),
      createdBy: 'local'
    };

    if (password && password.trim().length > 0) {
      ws.hasPassword = true;
      ws.passwordSalt = uuidv4(); // Generate a random salt for PBKDF2
      // We don't save the password! The user must type it to generate the key.
    }

    await db.workspaces.put(ws);
    setActiveWorkspaceId(id, ws.hasPassword, ws.passwordSalt);
  };

  const handleCreateDocument = async () => {
    if (!activeWorkspaceId) return;
    const title = prompt('Enter Document Title:');
    if (!title) return;

    const id = uuidv4();
    await db.documents.put({
      id,
      workspaceId: activeWorkspaceId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setActiveDocumentId(id);
  };

  return (
    <div style={{ 
      width: '280px', 
      backgroundColor: 'var(--bg-sidebar)', 
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      boxSizing: 'border-box' 
    }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>LocalMesh</h1>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Peer-to-Peer Collab</p>
      </div>

      <div style={{ padding: '1.5rem 1rem', flex: 1, overflowY: 'auto' }}>
        {/* Workspaces Section */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Workspaces</h3>
            <button 
              onClick={handleCreateWorkspace} 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              title="New Workspace"
            >
              <Plus size={16} />
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {workspaces?.map(ws => (
              <li 
                key={ws.id} 
                onClick={() => { setActiveWorkspaceId(ws.id, ws.hasPassword, ws.passwordSalt); setActiveDocumentId(''); }}
                style={{
                  padding: '0.5rem 0.75rem', 
                  cursor: 'pointer', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: activeWorkspaceId === ws.id ? 500 : 400,
                  backgroundColor: activeWorkspaceId === ws.id ? 'var(--border-subtle)' : 'transparent',
                  color: activeWorkspaceId === ws.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={e => { if(activeWorkspaceId !== ws.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}}
                onMouseOut={e => { if(activeWorkspaceId !== ws.id) e.currentTarget.style.backgroundColor = 'transparent'}}
              >
                <Folder size={16} strokeWidth={activeWorkspaceId === ws.id ? 2.5 : 2} style={{ color: activeWorkspaceId === ws.id ? 'var(--accent-primary)' : 'var(--text-muted)' }} /> 
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ws.name}</span>
              </li>
            ))}
            {workspaces?.length === 0 && (
              <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                Create a workspace to begin.
              </li>
            )}
          </ul>
        </div>

        {/* Documents Section */}
        {activeWorkspaceId && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Documents</h3>
              <button 
                onClick={handleCreateDocument} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                title="New Document"
              >
                <Plus size={16} />
              </button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {documents?.map(doc => (
                <li 
                  key={doc.id}
                  onClick={() => setActiveDocumentId(doc.id)}
                  style={{ 
                    padding: '0.5rem 0.75rem', 
                    cursor: 'pointer', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: activeDocumentId === doc.id ? 500 : 400,
                    backgroundColor: activeDocumentId === doc.id ? 'var(--border-subtle)' : 'transparent',
                    color: activeDocumentId === doc.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => { if(activeDocumentId !== doc.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}}
                  onMouseOut={e => { if(activeDocumentId !== doc.id) e.currentTarget.style.backgroundColor = 'transparent'}}
                >
                  <FileText size={16} strokeWidth={activeDocumentId === doc.id ? 2.5 : 2} style={{ color: activeDocumentId === doc.id ? 'var(--text-primary)' : 'var(--text-muted)' }} /> 
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</span>
                </li>
              ))}
              {documents?.length === 0 && (
                <li style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                  No documents yet.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Footer / Profile area */}
      <div style={{ 
        padding: '1rem', 
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={16} color="var(--text-primary)" />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>My Device</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deviceId.split('-')[0]}</div>
        </div>
        <Settings size={16} style={{ cursor: 'pointer' }} />
      </div>
    </div>
  );
}
