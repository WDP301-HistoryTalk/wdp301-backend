import { createClient, SupabaseClient } from '@supabase/supabase-js';

class SupabaseStorageService {
  private client: SupabaseClient | null = null;
  private defaultBucket: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    this.defaultBucket = process.env.SUPABASE_STORAGE_BUCKET || 'documents';

    if (supabaseUrl && supabaseKey) {
      this.client = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('Supabase credentials not configured in environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Storage features will throw if called.');
    }
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
      if (supabaseUrl && supabaseKey) {
        this.client = createClient(supabaseUrl, supabaseKey);
      } else {
        throw new Error('Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
      }
    }
    return this.client;
  }

  /**
   * Upload a file buffer directly to Supabase storage bucket
   */
  async uploadFile(
    filePath: string,
    fileBuffer: Buffer,
    contentType: string,
    bucketName: string = this.defaultBucket
  ): Promise<string> {
    const client = this.getClient();
    const { data, error } = await client.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
    }

    return data.path;
  }

  /**
   * Delete a file from Supabase storage bucket
   */
  async deleteFile(filePath: string, bucketName: string = this.defaultBucket): Promise<void> {
    if (!filePath) return;
    const client = this.getClient();

    let path = filePath;
    // Only unwrap a full http(s) public/signed URL — stored paths are always bucket-relative already
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const parts = path.split(`/${bucketName}/`);
      if (parts.length > 1) {
        path = parts[1].split('?')[0];
      }
    }

    const { error } = await client.storage.from(bucketName).remove([path]);
    if (error) {
      console.error(`Error deleting file from Supabase storage (${path}):`, error.message);
    }
  }

  /**
   * Create a signed URL for viewing/downloading a file
   */
  async createSignedUrl(
    filePath: string,
    expiresInSeconds: number = 300,
    downloadName?: string,
    bucketName: string = this.defaultBucket
  ): Promise<{ url: string; expiresIn: number }> {
    const client = this.getClient();

    let path = filePath;
    // Only unwrap a full http(s) public/signed URL — stored paths are always bucket-relative already
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const parts = path.split(`/${bucketName}/`);
      if (parts.length > 1) {
        path = parts[1].split('?')[0];
      }
    }

    const options: { download?: string } = {};
    if (downloadName) {
      options.download = downloadName;
    }

    const { data, error } = await client.storage
      .from(bucketName)
      .createSignedUrl(path, expiresInSeconds, options);

    if (error) {
      throw new Error(`Failed to generate signed URL from Supabase: ${error.message}`);
    }

    return {
      url: data.signedUrl,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Resolve a stored value into a URL usable directly as an <img>/<video> src.
   * Values that are already absolute http(s) URLs (legacy pasted links) pass
   * through untouched; private bucket paths (from direct-upload endpoints)
   * are exchanged for a freshly signed URL. Falls back to undefined instead
   * of throwing so a single broken/missing file can't fail an entire list
   * response.
   */
  async resolveViewUrl(
    filePath?: string | null,
    expiresInSeconds: number = 3600,
    bucketName: string = this.defaultBucket
  ): Promise<string | undefined> {
    if (!filePath) return undefined;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;

    try {
      const { url } = await this.createSignedUrl(filePath, expiresInSeconds, undefined, bucketName);
      return url;
    } catch (err: any) {
      console.warn(`[SupabaseStorageService] Failed to resolve view URL for ${filePath}:`, err.message);
      return undefined;
    }
  }

  /**
   * Get public URL of a file in Supabase storage
   */
  getPublicUrl(filePath: string, bucketName: string = this.defaultBucket): string {
    const client = this.getClient();
    const { data } = client.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  }
}

export const supabaseStorageService = new SupabaseStorageService();

