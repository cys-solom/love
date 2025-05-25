import { useState, useRef, useCallback } from 'react';
import { firestoreHelpers, COLLECTIONS } from '@/lib/firebase';

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: Date;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface VisitorData {
  id: string;
  photos: CapturedPhoto[];
  location: LocationData | null;
  visitTime: Date;
  userAgent: string;
}

export const useCamera = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load and start playing
        return new Promise<boolean>((resolve) => {
          const video = videoRef.current!;
          
          const handleLoadedData = () => {
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            // Additional wait to ensure video is fully ready
            setTimeout(() => resolve(true), 500);
          };
          
          const handleCanPlay = () => {
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            // Additional wait to ensure video is fully ready
            setTimeout(() => resolve(true), 500);
          };
          
          if (video.readyState >= 2) {
            // Video is already ready
            setTimeout(() => resolve(true), 500);
          } else {
            video.addEventListener('loadeddata', handleLoadedData);
            video.addEventListener('canplay', handleCanPlay);
          }
        });
      }
      
      return false;
    } catch (error) {
      console.error('Error accessing camera:', error);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState < 2) {
      console.warn('Video not ready for capture');
      return null;
    }

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('Video dimensions not available');
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas before drawing
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Check if image is actually captured (not just black)
    if (dataUrl === 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=') {
      console.warn('Captured black/empty image');
      return null;
    }

    const photo: CapturedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataUrl,
      timestamp: new Date()
    };

    return photo;
  }, []);

  const startAutomaticCapture = useCallback(async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    setCapturedPhotos([]);
    setCurrentPhotoIndex(0);

    // Start camera and wait for it to be fully ready
    const cameraStarted = await startCamera();
    if (!cameraStarted) {
      setIsCapturing(false);
      return;
    }

    // Additional wait to ensure video stream is stable
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture 10 photos with 2-second intervals
    const photos: CapturedPhoto[] = [];
    
    for (let i = 0; i < 10; i++) {
      setCurrentPhotoIndex(i + 1);
      
      // Wait a bit before capturing each photo to ensure stability
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let photo = null;
      let attempts = 0;
      
      // Try to capture photo with retries if it comes out black
      while (!photo && attempts < 3) {
        photo = capturePhoto();
        if (!photo) {
          console.log(`Attempt ${attempts + 1} failed for photo ${i + 1}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        attempts++;
      }
      
      if (photo) {
        photos.push(photo);
        setCapturedPhotos(prev => [...prev, photo]);
        
        // Store photo in localStorage
        const storageKey = `visitor_photo_${photo.id}`;
        localStorage.setItem(storageKey, photo.dataUrl);
      } else {
        console.error(`Failed to capture photo ${i + 1} after 3 attempts`);
      }
      
      // Wait 2 seconds before next capture (except for the last photo)
      if (i < 9) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Stop camera after capturing
    stopCamera();
    setIsCapturing(false);

    return photos;
  }, [isCapturing, startCamera, stopCamera, capturePhoto]);

  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      // Try to get multiple readings for better accuracy
      let bestAccuracy = Infinity;
      let bestPosition: GeolocationPosition | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      const tryGetLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            attempts++;
            console.log(`Location attempt ${attempts}:`, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });

            // Keep the most accurate reading
            if (position.coords.accuracy < bestAccuracy) {
              bestAccuracy = position.coords.accuracy;
              bestPosition = position;
            }

            // If we have good accuracy (< 100m) or reached max attempts, use the result
            if (position.coords.accuracy < 100 || attempts >= maxAttempts) {
              const locationData: LocationData = {
                latitude: bestPosition!.coords.latitude,
                longitude: bestPosition!.coords.longitude,
                accuracy: bestPosition!.coords.accuracy,
                timestamp: new Date()
              };
              console.log('Final location data:', locationData);
              resolve(locationData);
            } else {
              // Try again for better accuracy
              setTimeout(tryGetLocation, 1000);
            }
          },
          (error) => {
            console.error(`Location attempt ${attempts + 1} failed:`, error);
            attempts++;
            
            if (attempts >= maxAttempts) {
              if (bestPosition) {
                // Use best available position if we have one
                const locationData: LocationData = {
                  latitude: bestPosition.coords.latitude,
                  longitude: bestPosition.coords.longitude,
                  accuracy: bestPosition.coords.accuracy,
                  timestamp: new Date()
                };
                console.log('Using best available location:', locationData);
                resolve(locationData);
              } else {
                reject(error);
              }
            } else {
              // Try again
              setTimeout(tryGetLocation, 1000);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      };

      tryGetLocation();
    });
  }, []);

  const saveVisitorData = useCallback(async (photos: CapturedPhoto[]) => {
    try {
      const location = await getCurrentLocation();
      
      const visitor: VisitorData = {
        id: `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        photos,
        location,
        visitTime: new Date(),
        userAgent: navigator.userAgent
      };

      // Save to Firebase instead of localStorage
      try {
        await firestoreHelpers.addDocument(COLLECTIONS.NORMAL_VISITORS, visitor);
        console.log('✅ تم حفظ بيانات الزائر في Firebase');
      } catch (firebaseError) {
        console.error('❌ فشل في حفظ البيانات في Firebase، سيتم الحفظ محلياً:', firebaseError);
        // Fallback to localStorage if Firebase fails
        const existingVisitors = JSON.parse(localStorage.getItem('visitors') || '[]');
        existingVisitors.push(visitor);
        localStorage.setItem('visitors', JSON.stringify(existingVisitors));
      }

      setVisitorData(visitor);
      
      console.log('Visitor data saved:', visitor);
      return visitor;
    } catch (error) {
      console.error('Error saving visitor data:', error);
      return null;
    }
  }, [getCurrentLocation]);

  const getAllVisitors = useCallback(async (): Promise<VisitorData[]> => {
    try {
      // Try to get from Firebase first
      const firebaseVisitors = await firestoreHelpers.getDocuments(COLLECTIONS.NORMAL_VISITORS);
      if (firebaseVisitors.length > 0) {
        console.log('📊 تم تحميل البيانات من Firebase:', firebaseVisitors.length);
        return firebaseVisitors.map(doc => ({
          id: doc.id,
          photos: doc.photos || [],
          location: doc.location,
          visitTime: doc.visitTime?.toDate ? doc.visitTime.toDate() : new Date(doc.visitTime),
          userAgent: doc.userAgent
        }));
      }
      
      // Fallback to localStorage if Firebase is empty
      const localVisitors = JSON.parse(localStorage.getItem('visitors') || '[]');
      console.log('📊 تم تحميل البيانات محلياً:', localVisitors.length);
      return localVisitors;
    } catch (error) {
      console.error('Error loading visitors from Firebase, using localStorage:', error);
      // Fallback to localStorage if Firebase fails
      try {
        return JSON.parse(localStorage.getItem('visitors') || '[]');
      } catch (localError) {
        console.error('Error loading visitors from localStorage:', localError);
        return [];
      }
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      // Clear Firebase data
      await firestoreHelpers.deleteAllDocuments(COLLECTIONS.NORMAL_VISITORS);
      console.log('🗑️ تم مسح جميع البيانات من Firebase');
    } catch (error) {
      console.error('❌ خطأ في مسح البيانات من Firebase:', error);
    }
    
    // Also clear localStorage
    localStorage.removeItem('visitors');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('visitor_photo_')) {
        localStorage.removeItem(key);
      }
    }
    setCapturedPhotos([]);
    setVisitorData(null);
    console.log('🗑️ تم مسح جميع البيانات المحلية');
  }, []);

  return {
    // States
    isCapturing,
    capturedPhotos,
    currentPhotoIndex,
    visitorData,
    
    // Refs for components
    videoRef,
    canvasRef,
    
    // Functions
    startCamera,
    stopCamera,
    capturePhoto,
    startAutomaticCapture,
    getCurrentLocation,
    saveVisitorData,
    getAllVisitors,
    clearAllData
  };
};