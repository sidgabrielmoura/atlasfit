const { Pool } = require('pg');
const { S3Client, PutObjectCommand, ListBucketsCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const accessKeyId = process.env.CLOUDFLARE_ID_TOKEN_ACCESS || process.env.CLOUDFLARE_TOKEN_VALUE;
const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const endpoint = "https://ba71c882bd0e9a802f4a93d6cb22cd3c.r2.cloudflarestorage.com";
let bucketName = process.env.CLOUDFLARE_R2_BUCKET || "atlasfit";

const s3Client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

function parseBase64Image(dataUri) {
  const matches = dataUri.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }
  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  let extension = 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
  else if (mimeType.includes('gif')) extension = 'gif';
  else if (mimeType.includes('webp')) extension = 'webp';
  else if (mimeType.includes('svg')) extension = 'svg';

  return { mimeType, buffer, extension };
}

async function uploadToR2(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return `/api/storage/file?key=${encodeURIComponent(key)}`;
}

async function main() {
  console.log("=== MIGRATING BASE64 IMAGES IN DATABASE TO CLOUDFLARE R2 ===");

  if (!accessKeyId || !secretAccessKey) {
    console.error("Error: S3 Credentials not found in environment.");
    process.exit(1);
  }

  // Auto-detect & auto-create bucket
  try {
    const listCommand = new ListBucketsCommand({});
    const response = await s3Client.send(listCommand);
    const buckets = response.Buckets || [];
    console.log("Available R2 Buckets:", buckets.map(b => b.Name));
    
    const bucketNames = buckets.map(b => b.Name);
    if (!bucketNames.includes(bucketName)) {
      console.log(`Bucket "${bucketName}" not found. Creating bucket...`);
      const createCommand = new CreateBucketCommand({ Bucket: bucketName });
      await s3Client.send(createCommand);
      console.log(`Bucket "${bucketName}" created successfully.`);
    }
  } catch (err) {
    console.warn("Could not list/detect bucket. Attempting to create bucket directly. Error:", err.message);
    try {
      const createCommand = new CreateBucketCommand({ Bucket: bucketName });
      await s3Client.send(createCommand);
      console.log(`Bucket "${bucketName}" created directly.`);
    } catch (createErr) {
      console.warn("Could not create bucket directly. Moving on and hoping it exists. Error:", createErr.message);
    }
  }

  // 1. Users image migration
  console.log("1. Checking Users for Base64 avatars...");
  const { rows: users } = await pool.query('SELECT id, email, image FROM "User"');
  for (const user of users) {
    if (user.image && user.image.startsWith("data:")) {
      console.log(`Migrating avatar for user: ${user.email || user.id}`);
      const parsed = parseBase64Image(user.image);
      if (parsed) {
        const key = `system/avatars/user-${user.id}-${Date.now()}.${parsed.extension}`;
        const fileUrl = await uploadToR2(key, parsed.buffer, parsed.mimeType);
        await pool.query(
          'UPDATE "User" SET image = $1, "imageKey" = $2 WHERE id = $3',
          [fileUrl, key, user.id]
        );
        console.log(`-> Migrated to ${key}`);
      }
    }
  }

  // 2. Workspace branding migration
  console.log("\n2. Checking Workspaces for Base64 logos, watermarks, and covers...");
  const { rows: workspaces } = await pool.query('SELECT id, name, "logoUrl", "watermarkUrl", "workoutCoverUrl" FROM "Workspace"');
  for (const ws of workspaces) {
    // Logo
    if (ws.logoUrl && ws.logoUrl.startsWith("data:")) {
      console.log(`Migrating logo for workspace: ${ws.name}`);
      const parsed = parseBase64Image(ws.logoUrl);
      if (parsed) {
        const key = `workspace/${ws.id}/logos/logo-${Date.now()}.${parsed.extension}`;
        const fileUrl = await uploadToR2(key, parsed.buffer, parsed.mimeType);
        await pool.query(
          'UPDATE "Workspace" SET "logoUrl" = $1, "logoKey" = $2 WHERE id = $3',
          [fileUrl, key, ws.id]
        );
        console.log(`-> Logo migrated to ${key}`);
      }
    }
    // Watermark
    if (ws.watermarkUrl && ws.watermarkUrl.startsWith("data:")) {
      console.log(`Migrating watermark for workspace: ${ws.name}`);
      const parsed = parseBase64Image(ws.watermarkUrl);
      if (parsed) {
        const key = `workspace/${ws.id}/watermarks/watermark-${Date.now()}.${parsed.extension}`;
        const fileUrl = await uploadToR2(key, parsed.buffer, parsed.mimeType);
        await pool.query(
          'UPDATE "Workspace" SET "watermarkUrl" = $1, "watermarkKey" = $2 WHERE id = $3',
          [fileUrl, key, ws.id]
        );
        console.log(`-> Watermark migrated to ${key}`);
      }
    }
    // Cover
    if (ws.workoutCoverUrl && ws.workoutCoverUrl.startsWith("data:")) {
      console.log(`Migrating cover for workspace: ${ws.name}`);
      const parsed = parseBase64Image(ws.workoutCoverUrl);
      if (parsed) {
        const key = `workspace/${ws.id}/covers/cover-${Date.now()}.${parsed.extension}`;
        const fileUrl = await uploadToR2(key, parsed.buffer, parsed.mimeType);
        await pool.query(
          'UPDATE "Workspace" SET "workoutCoverUrl" = $1, "workoutCoverKey" = $2 WHERE id = $3',
          [fileUrl, key, ws.id]
        );
        console.log(`-> Cover migrated to ${key}`);
      }
    }
  }

  // 3. Campaigns banner migration
  console.log("\n3. Checking Campaigns for Base64 banners...");
  const { rows: campaigns } = await pool.query('SELECT id, title, "imageUrl" FROM "Campaign"');
  for (const campaign of campaigns) {
    if (campaign.imageUrl && campaign.imageUrl.startsWith("data:")) {
      console.log(`Migrating banner for campaign: ${campaign.title}`);
      const parsed = parseBase64Image(campaign.imageUrl);
      if (parsed) {
        const key = `campaigns/banner-${campaign.id}-${Date.now()}.${parsed.extension}`;
        const fileUrl = await uploadToR2(key, parsed.buffer, parsed.mimeType);
        await pool.query(
          'UPDATE "Campaign" SET "imageUrl" = $1, "imageKey" = $2 WHERE id = $3',
          [fileUrl, key, campaign.id]
        );
        console.log(`-> Banner migrated to ${key}`);
      }
    }
  }

  // 4. Student progress photo timeline migration
  console.log("\n4. Checking StudentProgressPhoto for Base64 photos...");
  const { rows: progressPhotos } = await pool.query('SELECT id, "studentId", "workspaceId", "photoUrl" FROM "StudentProgressPhoto"');
  for (const photo of progressPhotos) {
    if (photo.photoUrl && photo.photoUrl.startsWith("data:")) {
      console.log(`Migrating photo for student ${photo.studentId} in workspace ${photo.workspaceId}`);
      const parsed = parseBase64Image(photo.photoUrl);
      if (parsed) {
        const key = `workspace/${photo.workspaceId}/students/${photo.studentId}/progress/photo-${photo.id}-${Date.now()}.${parsed.extension}`;
        const fileUrl = await uploadToR2(key, parsed.buffer, parsed.mimeType);
        await pool.query(
          'UPDATE "StudentProgressPhoto" SET "photoUrl" = $1, "objectKey" = $2, "mimeType" = $3, size = $4 WHERE id = $5',
          [fileUrl, key, parsed.mimeType, parsed.buffer.length, photo.id]
        );
        console.log(`-> Photo migrated to ${key}`);
      }
    }
  }

  // 5. Physical evaluations postural photos migration
  console.log("\n5. Checking PhysicalEvaluation postural JSON for Base64 photos...");
  const { rows: evaluations } = await pool.query('SELECT id, "studentId", "workspaceId", postural FROM "PhysicalEvaluation"');
  for (const ev of evaluations) {
    if (ev.postural) {
      let post;
      try {
        post = typeof ev.postural === 'string' ? JSON.parse(ev.postural) : ev.postural;
      } catch (err) {
        continue;
      }

      if (post && post.photos) {
        let updated = false;
        const views = ['frontal', 'posterior', 'lateralRight', 'lateralLeft'];
        
        for (const view of views) {
          const imgVal = post.photos[view];
          if (imgVal && typeof imgVal === 'string' && imgVal.startsWith("data:")) {
            console.log(`Migrating postural photo (${view}) for evaluation: ${ev.id}`);
            const parsed = parseBase64Image(imgVal);
            if (parsed) {
              const key = `workspace/${ev.workspaceId}/students/${ev.studentId}/evaluations/evaluation-${ev.id}-${view}-${Date.now()}.${parsed.extension}`;
              const fileUrl = await uploadToR2(key, parsed.buffer, parsed.mimeType);
              
              // Instead of storing raw base64, save object representing R2 reference
              post.photos[view] = fileUrl;
              
              // We can also store the keys in a new posturalKeys object inside the JSON
              if (!post.photoKeys) post.photoKeys = {};
              post.photoKeys[view] = key;
              
              updated = true;
              console.log(`-> Postural (${view}) migrated to ${key}`);
            }
          }
        }

        if (updated) {
          await pool.query(
            'UPDATE "PhysicalEvaluation" SET postural = $1 WHERE id = $2',
            [JSON.stringify(post), ev.id]
          );
        }
      }
    }
  }

  console.log("\n=== DATABASE MIGRATION TO CLOUDFLARE R2 COMPLETED! ===");
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
