import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, enableNetwork, disableNetwork, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Collections
export const COLLECTIONS = {
  NORMAL_VISITORS: 'normal_visitors',
  STEALTH_VISITORS: 'stealth_visitors'
};

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase connection...');
    console.log('Firebase Config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      hasApiKey: !!firebaseConfig.apiKey
    });
    
    // Try to read from a test collection
    const testQuery = query(collection(db, 'test'));
    await getDocs(testQuery);
    console.log('✅ Firebase connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    return false;
  }
};

// Helper functions for Firestore operations
export const firestoreHelpers = {
  // Test connection before operations
  async ensureConnection() {
    try {
      await enableNetwork(db);
      return true;
    } catch (error) {
      console.warn('Failed to enable network:', error);
      return false;
    }
  },

  // Add a document with better error handling
  async addDocument(collectionName: string, data: any) {
    try {
      console.log(`📝 Adding document to ${collectionName}...`);
      
      // Test connection first
      const isOnline = await this.ensureConnection();
      if (!isOnline) {
        throw new Error('No network connection available');
      }

      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Document written with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding document to Firebase:', error);
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        console.error('🔐 Permission denied. Check Firestore security rules.');
      } else if (error.code === 'unavailable') {
        console.error('🌐 Firebase service unavailable. Check internet connection.');
      }
      
      throw error;
    }
  },

  // Get all documents from a collection with better error handling
  async getDocuments(collectionName: string) {
    try {
      console.log(`📖 Getting documents from ${collectionName}...`);
      
      // Test connection first
      const isOnline = await this.ensureConnection();
      if (!isOnline) {
        console.warn('No network connection, returning empty array');
        return [];
      }

      const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const documents: any[] = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Retrieved ${documents.length} documents from ${collectionName}`);
      return documents;
    } catch (error) {
      console.error('❌ Error getting documents from Firebase:', error);
      
      if (error.code === 'permission-denied') {
        console.error('🔐 Permission denied. Check Firestore security rules.');
      } else if (error.code === 'unavailable') {
        console.error('🌐 Firebase service unavailable. Check internet connection.');
      }
      
      // Return empty array instead of throwing, so app continues to work
      return [];
    }
  },

  // Delete a document with better error handling
  async deleteDocument(collectionName: string, docId: string) {
    try {
      console.log(`🗑️ Deleting document ${docId} from ${collectionName}...`);
      
      const isOnline = await this.ensureConnection();
      if (!isOnline) {
        throw new Error('No network connection available');
      }

      await deleteDoc(doc(db, collectionName, docId));
      console.log('✅ Document deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting document from Firebase:', error);
      throw error;
    }
  },

  // Delete all documents in a collection with better error handling
  async deleteAllDocuments(collectionName: string) {
    try {
      console.log(`🗑️ Deleting all documents from ${collectionName}...`);
      
      const isOnline = await this.ensureConnection();
      if (!isOnline) {
        throw new Error('No network connection available');
      }

      const querySnapshot = await getDocs(collection(db, collectionName));
      const deletePromises = querySnapshot.docs.map((document) => 
        deleteDoc(doc(db, collectionName, document.id))
      );
      
      await Promise.all(deletePromises);
      console.log(`✅ All documents deleted from ${collectionName}`);
    } catch (error) {
      console.error('❌ Error deleting all documents from Firebase:', error);
      throw error;
    }
  }
};

// Initialize connection test on module load
if (typeof window !== 'undefined') {
  testFirebaseConnection();
}