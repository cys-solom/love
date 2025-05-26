import React, { useState, useEffect } from 'react';
import { testSupabaseConnection, supabaseHelpers, TABLES } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'failed'>('testing');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    testConnection();
  }, []);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setIsLoading(true);
    addLog('🚀 بدء اختبار الاتصال بـ Supabase...');
    
    try {
      const result = await testSupabaseConnection();
      if (result) {
        setConnectionStatus('success');
        addLog('✅ نجح الاتصال بـ Supabase');
      } else {
        setConnectionStatus('failed');
        addLog('❌ فشل الاتصال بـ Supabase');
      }
    } catch (error: any) {
      setConnectionStatus('failed');
      addLog(`❌ خطأ في الاتصال: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAddVisitor = async () => {
    setIsLoading(true);
    addLog('📝 اختبار إضافة زائر...');
    
    try {
      const testData = {
        id: `test_visitor_${Date.now()}`,
        photos: [{
          id: 'test_photo',
          dataUrl: 'data:image/jpeg;base64,test',
          timestamp: new Date()
        }],
        location: {
          latitude: 30.0444,
          longitude: 31.2357,
          accuracy: 10,
          timestamp: new Date()
        },
        visitTime: new Date(),
        userAgent: navigator.userAgent
      };
      
      const visitorId = await supabaseHelpers.addVisitor(TABLES.NORMAL_VISITORS, testData);
      addLog(`✅ تم إضافة الزائر بنجاح. ID: ${visitorId}`);
    } catch (error: any) {
      addLog(`❌ فشل في إضافة الزائر: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetVisitors = async () => {
    setIsLoading(true);
    addLog('📖 اختبار قراءة الزوار...');
    
    try {
      const visitors = await supabaseHelpers.getVisitors(TABLES.NORMAL_VISITORS);
      addLog(`✅ تم قراءة ${visitors.length} زائر`);
    } catch (error: any) {
      addLog(`❌ فشل في قراءة الزوار: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 اختبار Supabase
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'success' ? 'bg-green-500' :
              connectionStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testConnection} disabled={isLoading}>
              اختبار الاتصال
            </Button>
            <Button onClick={testAddVisitor} disabled={isLoading}>
              اختبار الإضافة
            </Button>
            <Button onClick={testGetVisitors} disabled={isLoading}>
              اختبار القراءة
            </Button>
            <Button onClick={clearLogs} variant="outline">
              مسح السجلات
            </Button>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2">سجل الاختبار:</h3>
            {testResults.length === 0 ? (
              <p className="text-gray-500">لا توجد سجلات بعد...</p>
            ) : (
              <div className="space-y-1 text-sm font-mono">
                {testResults.map((result, index) => (
                  <div key={index} className="whitespace-pre-wrap">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <p><strong>حالة الاتصال:</strong> {
              connectionStatus === 'success' ? '✅ متصل' :
              connectionStatus === 'failed' ? '❌ غير متصل' : '🔄 جاري الاختبار...'
            }</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseTest;