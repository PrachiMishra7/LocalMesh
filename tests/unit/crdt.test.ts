import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { simulateTwoWaySync } from '../../src/core/sync/syncProtocol';

describe('Yjs CRDT Convergence (Phase 2)', () => {
  let docA: Y.Doc;
  let docB: Y.Doc;

  beforeEach(() => {
    // Create two isolated peers
    docA = new Y.Doc();
    docB = new Y.Doc();
  });

  it('should converge when peers make independent simultaneous edits', () => {
    // Both peers start with a shared data structure
    const textA = docA.getText('shared-doc');
    const textB = docB.getText('shared-doc');

    // Peer A makes offline edits
    textA.insert(0, 'Hello from A. ');
    
    // Peer B makes offline edits simultaneously
    textB.insert(0, 'Hello from B. ');

    // Their states are divergent before sync
    expect(textA.toString()).not.toBe(textB.toString());

    // Perform the sync protocol exchange
    simulateTwoWaySync(docA, docB);

    // CRDT Rule 6: Deterministic Convergence
    // State(A) == State(B)
    expect(textA.toString()).toBe(textB.toString());
    
    // Yjs usually orders by peer ID internally, so we just verify they match exactly.
    expect(textA.toString().includes('Hello from A.')).toBe(true);
    expect(textA.toString().includes('Hello from B.')).toBe(true);
  });

  it('should handle complex interleaved map and array edits', () => {
    const mapA = docA.getMap('metadata');
    const mapB = docB.getMap('metadata');

    const arrA = docA.getArray('list');
    const arrB = docB.getArray('list');

    // Initial identical setup via a dummy sync
    mapA.set('title', 'Initial Title');
    arrA.insert(0, ['Item 1']);
    simulateTwoWaySync(docA, docB);

    // Disconnect peers and make complex edits
    mapA.set('title', 'Title changed by A');
    arrA.insert(1, ['Item A1', 'Item A2']);
    
    mapB.set('author', 'User B'); // B adds a new key
    arrB.delete(0, 1); // B deletes the first item
    arrB.insert(0, ['Item B1']);

    // Reconnect and sync
    simulateTwoWaySync(docA, docB);

    // Assert absolute convergence
    expect(mapA.toJSON()).toEqual(mapB.toJSON());
    expect(arrA.toJSON()).toEqual(arrB.toJSON());

    // Verify specific properties survived
    expect(mapA.get('title')).toBe('Title changed by A'); // A's edit wins deterministically based on logical clocks
    expect(mapA.get('author')).toBe('User B');
    
    // Array order should be deterministic
    expect(arrA.length).toBe(3); 
  });
});
