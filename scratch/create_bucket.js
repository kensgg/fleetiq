require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: buckets, error: getError } = await supabase.storage.listBuckets();
  if (getError) {
    console.error("Error listing buckets:", getError);
    return;
  }
  
  const reportesBucket = buckets.find(b => b.name === 'reportes');
  if (!reportesBucket) {
    console.log("Creating 'reportes' bucket...");
    const { data, error } = await supabase.storage.createBucket('reportes', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    if (error) {
      console.error("Error creating bucket:", error);
    } else {
      console.log("Bucket created:", data);
    }
  } else {
    console.log("'reportes' bucket already exists:", reportesBucket);
    // Ensure it's public
    if (!reportesBucket.public) {
       console.log("Updating to public...");
       const { error } = await supabase.storage.updateBucket('reportes', { public: true });
       console.log(error ? "Error updating: " + error : "Updated to public");
    }
  }
}

main();
