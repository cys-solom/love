import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, enableNetwork } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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

// Initialize Auth for anonymous authentication
export const auth = getAuth(app);

// Initialize Storage
export const storage = getStorage(app);

// Auto sign in anonymously
let isAuthInitialized = false;
const initializeAuth = async () => {
  if (isAuthInitialized) return;
  
  try {
    await signInAnonymously(auth);
    console.log('✅ تم تسجيل الدخول بشكل مجهول');
    isAuthInitialized = true;
  } catch (error) {
    console.error('❌ فشل في تسجيل الدخول المجهول:', error);
  }
};

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('👤 المستخدم مسجل الدخول:', user.uid);
    isAuthInitialized = true;
  } else {
    console.log('👤 المستخدم غير مسجل الدخول');
    isAuthInitialized = false;
  }
});

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
  // Ensure authentication before operations
  async ensureAuthentication() {
    if (!isAuthInitialized) {
      await initializeAuth();
      // Wait a bit for auth to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return isAuthInitialized;
  },

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

  // Add a document with authentication
  async addDocument(collectionName: string, data: any) {
    try {
      console.log(`📝 Adding document to ${collectionName}...`);
      
      // Ensure authentication first
      const isAuthenticated = await this.ensureAuthentication();
      if (!isAuthenticated) {
        throw new Error('Authentication failed');
      }
      
      // Test connection
      const isOnline = await this.ensureConnection();
      if (!isOnline) {
        throw new Error('No network connection available');
      }

      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: auth.currentUser?.uid || 'anonymous'
      });
      
      console.log('✅ Document written with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding document to Firebase:', error);
      
      if (error.code === 'permission-denied') {
        console.error('🔐 Permission denied. User might not be authenticated.');
      } else if (error.code === 'unavailable') {
        console.error('🌐 Firebase service unavailable. Check internet connection.');
      }
      
      throw error;
    }
  },

  // Get all documents with authentication
  async getDocuments(collectionName: string) {
    try {
      console.log(`📖 Getting documents from ${collectionName}...`);
      
      // Ensure authentication first
      const isAuthenticated = await this.ensureAuthentication();
      if (!isAuthenticated) {
        console.warn('Authentication failed, returning empty array');
        return [];
      }
      
      // Test connection
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
        console.error('🔐 Permission denied. Check authentication or Firestore rules.');
      }
      
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

// Initialize authentication on module load
if (typeof window !== 'undefined') {
  initializeAuth();
  testFirebaseConnection();
}