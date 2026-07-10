import React from 'react';
import { db, Workspace, DocumentMeta } from '../core/storage/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { Folder, FileText, Plus, Hash } from 'lucide-react';

interface SidebarProps {
  deviceId: string;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
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
    () => activeWorkspaceId 
      ? db.documents.where('workspaceId').equals(activeWorkspaceId).reverse().sortBy('updatedAt')
      : []
    , [activeWorkspaceId]
  );

  const handleCreateWorkspace = async () => {
    const name = prompt('Enter Workspace Name:');
    if (!name) return;
    
    const id = uuidv4();
    await db.workspaces.put({
      id,
      name,
      createdBy: deviceId,
      createdAt: Date.now()
    });
    setActiveWorkspaceId(id);
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
    <div style={{ width: '280px', backgroundColor: '#1e1e24', color: '#fff', display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem', boxSizing: 'border-box' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '2rem' }}>
        <Hash size={20} color="#00a8ff" /> LocalMesh
      </h2>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workspaces</h3>
          <button onClick={handleCreateWorkspace} style={{ background: 'none', border: 'none', color: '#00a8ff', cursor: 'pointer' }} title="New Workspace">
            <Plus size={16} />
          </button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {workspaces?.map(ws => (
            <li 
              key={ws.id} 
              onClick={() => { setActiveWorkspaceId(ws.id); setActiveDocumentId(''); }}
              style={{ 
                padding: '0.5rem', 
                cursor: 'pointer', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: activeWorkspaceId === ws.id ? '#2a2a35' : 'transparent',
                color: activeWorkspaceId === ws.id ? '#fff' : '#ccc'
              }}
            >
              <Folder size={16} /> {ws.name}
            </li>
          ))}
          {workspaces?.length === 0 && <li style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>No workspaces</li>}
        </ul>
      </div>

      {activeWorkspaceId && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documents</h3>
            <button onClick={handleCreateDocument} style={{ background: 'none', border: 'none', color: '#00a8ff', cursor: 'pointer' }} title="New Document">
              <Plus size={16} />
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {documents?.map(doc => (
              <li 
                key={doc.id}
                onClick={() => setActiveDocumentId(doc.id)}
                style={{ 
                  padding: '0.5rem', 
                  cursor: 'pointer', 
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: activeDocumentId === doc.id ? '#2a2a35' : 'transparent',
                  color: activeDocumentId === doc.id ? '#fff' : '#ccc'
                }}
              >
                <FileText size={16} /> {doc.title}
              </li>
            ))}
            {documents?.length === 0 && <li style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>No documents</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
