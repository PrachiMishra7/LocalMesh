import { v4 as uuidv4 } from 'uuid';
import { db } from '../storage/db';

export const getOrCreateDeviceId = async (): Promise<string> => {
  const IDENTITY_KEY = 'local-mesh-device-id';
  
  // First check if we have it in Dexie
  const existingIdentity = await db.identities.get(IDENTITY_KEY);
  if (existingIdentity) {
    return existingIdentity.deviceId;
  }

  // If not, create a new one
  const newDeviceId = uuidv4();
  await db.identities.put({
    id: IDENTITY_KEY,
    deviceId: newDeviceId,
    createdAt: Date.now()
  });

  return newDeviceId;
};
