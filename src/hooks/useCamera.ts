import { useState, useRef, useCallback } from 'react';
import { supabaseHelpers, TABLES } from '@/lib/supabase';

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

      // Try Supabase first, fallback to localStorage
      let savedToSupabase = false;
      try {
        await supabaseHelpers.addVisitor(TABLES.NORMAL_VISITORS, visitor);
        console.log('✅ تم حفظ بيانات الزائر في Supabase');
        savedToSupabase = true;
      } catch (supabaseError) {
        console.warn('⚠️ فشل في حفظ البيانات في Supabase، سيتم الحفظ محلياً:', supabaseError);
      }

      // Always save to localStorage as backup
      try {
        const existingVisitors = JSON.parse(localStorage.getItem('visitors') || '[]');
        existingVisitors.push({
          ...visitor,
          savedToSupabase
        });
        localStorage.setItem('visitors', JSON.stringify(existingVisitors));
        console.log('💾 تم حفظ بيانات الزائر محلياً');
      } catch (localError) {
        console.error('❌ فشل في الحفظ المحلي:', localError);
      }

      setVisitorData(visitor);
      return visitor;
    } catch (error) {
      console.error('Error saving visitor data:', error);
      return null;
    }
  }, [getCurrentLocation]);

  // Get all visitors data
  const getAllVisitors = async (): Promise<any[]> => {
    try {
      console.log('📖 جاري تحميل بيانات الزوار العاديين...');
      
      // Try to get data from Supabase first
      const supabaseVisitors = await supabaseHelpers.getVisitors(TABLES.NORMAL_VISITORS);
      
      // Get localStorage data as fallback
      const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
      const localVisitors = localData.map((visitor: any) => ({
        ...visitor,
        visitTime: new Date(visitor.visitTime),
        photos: visitor.photos.map((photo: any) => ({
          ...photo,
          timestamp: new Date(photo.timestamp)
        })),
        location: visitor.location ? {
          ...visitor.location,
          timestamp: new Date(visitor.location.timestamp)
        } : null
      }));

      // Combine both sources, prioritizing Supabase data
      const allVisitors = [...supabaseVisitors, ...localVisitors];
      
      // Remove duplicates based on ID
      const uniqueVisitors = allVisitors.reduce((acc: any[], current: any) => {
        const exists = acc.find(visitor => visitor.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      // Sort by visit time (newest first)
      uniqueVisitors.sort((a, b) => new Date(b.visitTime).getTime() - new Date(a.visitTime).getTime());

      console.log(`✅ تم تحميل ${uniqueVisitors.length} زائر عادي (${supabaseVisitors.length} من Supabase + ${localVisitors.length} محلي)`);
      return uniqueVisitors;
    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
      
      // Fallback to localStorage only
      const localData = JSON.parse(localStorage.getItem('visitors') || '[]');
      return localData.map((visitor: any) => ({
        ...visitor,
        visitTime: new Date(visitor.visitTime),
        photos: visitor.photos.map((photo: any) => ({
          ...photo,
          timestamp: new Date(photo.timestamp)
        })),
        location: visitor.location ? {
          ...visitor.location,
          timestamp: new Date(visitor.location.timestamp)
        } : null
      }));
    }
  };

  const clearAllData = useCallback(async () => {
    try {
      // Clear Supabase data
      await supabaseHelpers.deleteAllVisitors(TABLES.NORMAL_VISITORS);
      console.log('🗑️ تم مسح جميع البيانات من Supabase');
    } catch (error) {
      console.error('❌ خطأ في مسح البيانات من Supabase:', error);
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