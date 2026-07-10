import * as Y from 'yjs';

/**
 * Generates a State Vector representing the current logical clock of the document.
 * This is extremely lightweight and is used to ask another peer: 
 * "Here is what I have, what am I missing?"
 */
export const generateStateVector = (doc: Y.Doc): Uint8Array => {
  return Y.encodeStateVector(doc);
};

/**
 * Given a remote peer's State Vector, this calculates the missing updates
 * that the remote peer needs to catch up to our state.
 */
export const generateSyncUpdate = (doc: Y.Doc, remoteStateVector: Uint8Array): Uint8Array => {
  return Y.encodeStateAsUpdate(doc, remoteStateVector);
};

/**
 * Applies an update received from a remote peer to our local document.
 */
export const applySyncUpdate = (doc: Y.Doc, update: Uint8Array): void => {
  Y.applyUpdate(doc, update);
};

/**
 * Simulates a full 2-way synchronization between two documents.
 * In a real application, these steps happen over a network transport (like WebRTC).
 */
export const simulateTwoWaySync = (docA: Y.Doc, docB: Y.Doc): void => {
  // Step 1: A asks B for missing updates
  const svA = generateStateVector(docA);
  const updateForA = generateSyncUpdate(docB, svA);
  applySyncUpdate(docA, updateForA);

  // Step 2: B asks A for missing updates
  const svB = generateStateVector(docB);
  const updateForB = generateSyncUpdate(docA, svB);
  applySyncUpdate(docB, updateForB);
};
