import React, { useState, useEffect } from 'react';
import { testFirebaseConnection, firestoreHelpers, COLLECTIONS } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FirebaseTest: React.FC = () => {
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
    addLog('🔥 بدء اختبار الاتصال بـ Firebase...');
    
    try {
      const result = await testFirebaseConnection();
      if (result) {
        setConnectionStatus('success');
        addLog('✅ نجح الاتصال بـ Firebase');
      } else {
        setConnectionStatus('failed');
        addLog('❌ فشل الاتصال بـ Firebase');
      }
    } catch (error) {
      setConnectionStatus('failed');
      addLog(`❌ خطأ في الاتصال: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAddDocument = async () => {
    setIsLoading(true);
    addLog('📝 اختبار إضافة مستند...');
    
    try {
      const testData = {
        id: `test_${Date.now()}`,
        message: 'Test document',
        timestamp: new Date()
      };
      
      const docId = await firestoreHelpers.addDocument('test_collection', testData);
      addLog(`✅ تم إضافة المستند بنجاح. ID: ${docId}`);
    } catch (error) {
      addLog(`❌ فشل في إضافة المستند: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetDocuments = async () => {
    setIsLoading(true);
    addLog('📖 اختبار قراءة المستندات...');
    
    try {
      const docs = await firestoreHelpers.getDocuments('test_collection');
      addLog(`✅ تم قراءة ${docs.length} مستند`);
    } catch (error) {
      addLog(`❌ فشل في قراءة المستندات: ${error.message}`);
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
            🔥 اختبار Firebase
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
            <Button onClick={testAddDocument} disabled={isLoading}>
              اختبار الإضافة
            </Button>
            <Button onClick={testGetDocuments} disabled={isLoading}>
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

export default FirebaseTest;