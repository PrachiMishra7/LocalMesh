import Dexie, { type EntityTable } from 'dexie';

export interface Identity {
  id: string;
  deviceId: string;
  createdAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  createdBy: string; // deviceId of admin/owner
  createdAt: number;
  hasPassword?: boolean;
  passwordSalt?: string;
}

export interface DocumentMeta {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityEvent {
  id: string;        // uuid
  workspaceId: string;
  peerId: string;    // short device id
  event: 'join' | 'leave';
  timestamp: number;
}

const db = new Dexie('LocalMeshDB_v2') as Dexie & {
  identities: EntityTable<Identity, 'id'>;
  workspaces: EntityTable<Workspace, 'id'>;
  documents: EntityTable<DocumentMeta, 'id'>;
  activity: EntityTable<ActivityEvent, 'id'>;
};

// Schema declaration
db.version(1).stores({
  notes: 'id, updatedAt',
  identities: 'id'
});

// Upgrade to version 2 (adds workspaces and documents, deletes notes)
db.version(2).stores({
  identities: 'id',
  workspaces: 'id, createdAt',
  documents: 'id, workspaceId, updatedAt',
  notes: null
});

// Upgrade to version 3 (adds activity log)
db.version(3).stores({
  identities: 'id',
  workspaces: 'id, createdAt',
  documents: 'id, workspaceId, updatedAt',
  activity: 'id, workspaceId, timestamp'
});

export { db };
