import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFARE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFARE_SECRET_ACCESS_KEY,
  },
});

const command = new PutBucketCorsCommand({
  Bucket: 'avatar-details',
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
  },
});

client.send(command)
  .then(() => console.log('CORS successfully configured for avatar-details bucket!'))
  .catch((err) => console.error('Error configuring CORS:', err));
