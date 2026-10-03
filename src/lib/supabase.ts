import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * Public Supabase client for browser and client-side queries
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

/**
 * Privileged Admin Supabase client for Serverless API routes.
 * Bypasses Row Level Security (RLS) to safely read and write database records & storage files.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceRoleKey || supabaseAnonKey || "placeholder",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseUrl !== "https://placeholder.supabase.co" &&
    (supabaseServiceRoleKey || supabaseAnonKey)
  );
}

/**
 * Uploads a buffer or base64 data to Supabase Storage and returns its high-speed public CDN URL.
 */
export async function uploadToSupabaseStorage(
  bucketName: string,
  filePath: string,
  fileData: Buffer | Uint8Array,
  contentType: string = "image/webp"
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const cleanPath = filePath.replace(/^\/+/, "");

    // 1. Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucketName);

    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
      });
    }

    // 2. Upload file
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(cleanPath, fileData, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn("[Supabase Storage] Upload error:", uploadError.message);
      return null;
    }

    // 3. Retrieve public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(cleanPath);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn("[Supabase Storage] Exception during upload:", err);
    return null;
  }
}
