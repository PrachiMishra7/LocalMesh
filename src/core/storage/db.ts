import Dexie, { type EntityTable } from 'dexie';

export interface Identity {
  id: string;
  deviceId: string;
  createdAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
}

export interface DocumentMeta {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

const db = new Dexie('LocalMeshDB') as Dexie & {
  identities: EntityTable<Identity, 'id'>;
  workspaces: EntityTable<Workspace, 'id'>;
  documents: EntityTable<DocumentMeta, 'id'>;
};

// Schema declaration (incremented version to 2 to add new tables safely)
db.version(2).stores({
  identities: 'id',
  workspaces: 'id, createdAt',
  documents: 'id, workspaceId, updatedAt'
});

export { db };
