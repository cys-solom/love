// This file is intentionally empty
// Firebase functionality has been removed

export const COLLECTIONS = {
  NORMAL_VISITORS: 'normal_visitors',
  STEALTH_VISITORS: 'stealth_visitors'
};

// Placeholder functions that do nothing
export const db = null;
export const auth = null;
export const storage = null;

export const testFirebaseConnection = async () => {
  console.log('Firebase has been removed from this project');
  return false;
};

export const firestoreHelpers = {
  async ensureAuthentication() {
    return false;
  },
  async ensureConnection() {
    return false;
  },
  async addDocument(collectionName: string, data: any) {
    console.log('Firebase has been removed, document not added');
    return 'dummy-id';
  },
  async getDocuments(collectionName: string) {
    console.log('Firebase has been removed, returning empty array');
    return [];
  },
  async deleteDocument(collectionName: string, docId: string) {
    console.log('Firebase has been removed, document not deleted');
  },
  async deleteAllDocuments(collectionName: string) {
    console.log('Firebase has been removed, documents not deleted');
  }
};