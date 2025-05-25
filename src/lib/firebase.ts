import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
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

// Helper functions for Firestore operations
export const firestoreHelpers = {
  // Add a document
  async addDocument(collectionName: string, data: any) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Document written with ID: ', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding document: ', error);
      throw error;
    }
  },

  // Get all documents from a collection
  async getDocuments(collectionName: string) {
    try {
      const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const documents: any[] = [];
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return documents;
    } catch (error) {
      console.error('Error getting documents: ', error);
      throw error;
    }
  },

  // Delete a document
  async deleteDocument(collectionName: string, docId: string) {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      console.log('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document: ', error);
      throw error;
    }
  },

  // Delete all documents in a collection
  async deleteAllDocuments(collectionName: string) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const deletePromises = querySnapshot.docs.map((document) => 
        deleteDoc(doc(db, collectionName, document.id))
      );
      await Promise.all(deletePromises);
      console.log(`All documents deleted from ${collectionName}`);
    } catch (error) {
      console.error('Error deleting all documents: ', error);
      throw error;
    }
  }
};