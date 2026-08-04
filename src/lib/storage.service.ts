import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accessKeyId = process.env.CLOUDFLARE_ID_TOKEN_ACCESS || process.env.CLOUDFLARE_TOKEN_VALUE;
const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const endpoint = "https://ba71c882bd0e9a802f4a93d6cb22cd3c.r2.cloudflarestorage.com";
const bucketName = process.env.CLOUDFLARE_R2_BUCKET || "atlasfit";

if (!accessKeyId || !secretAccessKey) {
  console.warn("WARNING: Cloudflare R2 credentials are not fully configured in environment variables.");
}

export const s3Client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

export const storageService = {
  getBucketName() {
    return bucketName;
  },

  /**
   * Generates a presigned PUT URL to upload files directly to Cloudflare R2
   */
  async getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });
    
    return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  },

  /**
   * Directly uploads a Buffer to Cloudflare R2 (useful for migrations and backend actions)
   */
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
  },

  /**
   * Deletes an object from Cloudflare R2
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
  },

  /**
   * Retrieves an object from Cloudflare R2 as a stream for secure proxy serving
   */
  async getObjectStream(key: string) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      body: response.Body,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  },

  /**
   * Fetches real-time statistics and recent files directly from Cloudflare R2 bucket
   */
  async getBucketStats() {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 100,
      });

      const response = await s3Client.send(command);
      const contents = response.Contents || [];

      let totalBytes = 0;
      const filesList = contents.map((item) => {
        const size = item.Size || 0;
        totalBytes += size;
        return {
          key: item.Key || "",
          size,
          sizeFormatted: (size / (1024 * 1024)).toFixed(2) + " MB",
          lastModified: item.LastModified || new Date(),
          eTag: item.ETag || "",
          fileUrl: `/api/storage/file?key=${encodeURIComponent(item.Key || "")}`,
        };
      });

      // Sort recent files descending
      filesList.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

      const totalMb = parseFloat((totalBytes / (1024 * 1024)).toFixed(2));
      const totalGb = parseFloat((totalMb / 1024).toFixed(3));

      return {
        bucketName,
        totalBytes,
        totalMb,
        totalGb,
        totalObjects: response.KeyCount || contents.length,
        isTruncated: response.IsTruncated || false,
        files: filesList,
        liveCloudflare: true,
      };
    } catch (err: any) {
      console.warn("Cloudflare R2 live fetch warning:", err.message);
      return {
        bucketName,
        totalBytes: 0,
        totalMb: 0,
        totalGb: 0,
        totalObjects: 0,
        isTruncated: false,
        files: [],
        liveCloudflare: false,
        error: err.message,
      };
    }
  },
};

