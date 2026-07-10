import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '../../src/core/storage/db';

describe('LocalMesh DB (IndexedDB via Dexie)', () => {
  beforeEach(async () => {
    // Clear data before each test
    await db.notes.clear();
    await db.identities.clear();
  });

  afterAll(async () => {
    // Clean up completely
    await db.delete();
  });

  it('should store and retrieve a note', async () => {
    const testNote = {
      id: 'test-note-1',
      content: 'Hello LocalMesh',
      createdAt: 1000,
      updatedAt: 1000
    };

    await db.notes.put(testNote);
    const retrieved = await db.notes.get('test-note-1');

    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBe('Hello LocalMesh');
  });

  it('should store and retrieve an identity', async () => {
    const testIdentity = {
      id: 'local-mesh-device-id',
      deviceId: 'uuid-1234',
      createdAt: 1000
    };

    await db.identities.put(testIdentity);
    const retrieved = await db.identities.get('local-mesh-device-id');

    expect(retrieved).toBeDefined();
    expect(retrieved?.deviceId).toBe('uuid-1234');
  });
});
