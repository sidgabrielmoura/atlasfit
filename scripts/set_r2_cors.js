require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const accessKeyId = process.env.CLOUDFLARE_ID_TOKEN_ACCESS || process.env.CLOUDFLARE_TOKEN_VALUE;
const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const endpoint = "https://ba71c882bd0e9a802f4a93d6cb22cd3c.r2.cloudflarestorage.com";
const bucketName = process.env.CLOUDFLARE_R2_BUCKET || "atlasfit";

if (!accessKeyId || !secretAccessKey) {
  console.error("Error: S3 Credentials not found in environment.");
  process.exit(1);
}

const s3Client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  console.log(`=== Configurando CORS para o bucket "${bucketName}" no Cloudflare R2 ===`);
  const corsRule = {
    CORSRules: [
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        AllowedOrigins: ["*"],
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3000
      }
    ]
  };

  const command = new PutBucketCorsCommand({
    Bucket: bucketName,
    CORSConfiguration: corsRule,
  });

  try {
    await s3Client.send(command);
    console.log("CORS configurado com sucesso! Permitido GET, PUT, POST, DELETE, HEAD de qualquer origem (*).");
  } catch (err) {
    console.error("Erro ao configurar CORS:", err.message);
    process.exit(1);
  }
}

main();
