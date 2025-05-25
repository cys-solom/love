import React from 'react';
import { useCamera } from '@/hooks/useCamera';
import { Camera, MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CameraManagerProps {
  onComplete: () => void;
}

const CameraManager: React.FC<CameraManagerProps> = ({ onComplete }) => {
  const {
    isCapturing,
    capturedPhotos,
    currentPhotoIndex,
    videoRef,
    canvasRef,
    startAutomaticCapture,
    saveVisitorData
  } = useCamera();

  const [captureComplete, setCaptureComplete] = React.useState(false);
  const [status, setStatus] = React.useState('');

  const handleStartCapture = async () => {
    setStatus('بدء التقاط الصور...');
    const photos = await startAutomaticCapture();
    
    if (photos && photos.length > 0) {
      setStatus('حفظ البيانات...');
      const visitorData = await saveVisitorData(photos);
      
      if (visitorData) {
        setStatus(`تم الحفظ بنجاح! تم التقاط ${photos.length} صورة`);
        setCaptureComplete(true);
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        setStatus('خطأ في حفظ البيانات');
      }
    } else {
      setStatus('خطأ في التقاط الصور');
    }
  };

  const progressPercentage = (currentPhotoIndex / 10) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-seductive-bg to-seductive-bg/80 p-4">
      <Card className="w-full max-w-2xl bg-white/10 backdrop-blur-sm border border-white/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
            <Camera className="w-6 h-6" />
            نظام التقاط الصور
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Video preview - show during capture */}
          {isCapturing && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md mx-auto rounded-lg border-2 border-white/30"
              />
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                مباشر
              </div>
            </div>
          )}
          
          {/* Hidden video element for non-capture states */}
          {!isCapturing && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
            />
          )}
          
          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />
          
          {!isCapturing && !captureComplete && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 text-white/90">
                <Camera className="w-8 h-8" />
                <MapPin className="w-8 h-8" />
              </div>
              <p className="text-white/90">
                سيتم التقاط 10 صور متتالية كل ثانيتين
              </p>
              <p className="text-white/70 text-sm">
                تأكد من وضوح وجهك أمام الكاميرا
              </p>
              <Button 
                onClick={handleStartCapture}
                className="w-full bg-seductive-accent hover:bg-seductive-accent/90"
              >
                ابدأ التقاط الصور
              </Button>
            </div>
          )}
          
          {isCapturing && (
            <div className="space-y-4">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-seductive-accent animate-spin mx-auto mb-4" />
                <p className="text-white text-lg mb-2">
                  جاري التقاط الصورة {currentPhotoIndex} من 10
                </p>
                <Progress value={progressPercentage} className="w-full" />
              </div>
              
              <div className="text-center text-white/80 text-sm">
                {status}
              </div>
              
              {capturedPhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-white/90 text-center text-sm">
                    الصور الملتقطة: {capturedPhotos.length}
                  </p>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 10 }, (_, index) => (
                      <div
                        key={index}
                        className={`aspect-square rounded border-2 ${
                          index < capturedPhotos.length
                            ? 'border-green-400 bg-green-400/20'
                            : index === currentPhotoIndex
                            ? 'border-yellow-400 bg-yellow-400/20 animate-pulse'
                            : 'border-white/30 bg-white/10'
                        }`}
                      >
                        {index < capturedPhotos.length && (
                          <CheckCircle className="w-full h-full p-1 text-green-400" />
                        )}
                        {index === currentPhotoIndex && index >= capturedPhotos.length && (
                          <Camera className="w-full h-full p-1 text-yellow-400 animate-pulse" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {captureComplete && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <p className="text-white text-lg">تم الانتهاء بنجاح!</p>
              <p className="text-white/80 text-sm">{status}</p>
              <p className="text-white/60 text-xs">
                سيتم توجيهك للصفحة الرئيسية خلال ثوانٍ...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraManager;