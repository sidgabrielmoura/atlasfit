import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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
};
