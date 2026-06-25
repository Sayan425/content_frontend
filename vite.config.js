import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const htmlRewritePlugin = () => ({
  name: 'html-rewrite',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/src') || req.url.startsWith('/components') || req.url.startsWith('/node_modules') || req.url.startsWith('/@') || req.url.includes('.')) {
        return next();
      }

      const match = req.url.match(/^\/([^\/?]+)\/?([^\/?]*)/);
      if (match) {
        const page = match[1];
        const tools = ['idea-labs', 'script-room', 'production-queue', 'edit-queue', 'avatar-studio', 'edit-suite', 'completed-videos'];
        
        if (tools.includes(page) || page === 'workspace') {
          req.url = `/workspace.html`;
        } else if (page === 'dashboard') {
          req.url = `/dashboard.html`;
        }
      }
      next();
    });
  }
});

const r2ApiPlugin = () => ({
  name: 'r2-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/generate-overlay-image' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { prompt, size } = JSON.parse(body);
            if (!prompt) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Missing prompt' }));
            }

            const fetchImage = async () => {
              const res = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                  model: "gpt-image-1-mini",
                  prompt: prompt,
                  n: 1,
                  size: size || "1024x1024",
                  quality: "low",
                  output_format: "png"
                })
              });
              const data = await res.json();
              if (data.error) throw new Error(data.error.message);
              return data.data[0].b64_json;
            };

            const [b64_1, b64_2] = await Promise.all([fetchImage(), fetchImage()]);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, images: [b64_1, b64_2] }));
          } catch (err) {
            console.error('Gemini error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (req.url === '/api/upload-overlay-image' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { imageBase64, customBucket, customPath, customPublicUrlBase } = JSON.parse(body);
            if (!imageBase64) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Missing imageBase64' }));
            }

            // Decode base64 to buffer
            const buffer = Buffer.from(imageBase64, 'base64');

            // Upload to R2
            const s3Client = new S3Client({
              region: 'auto',
              endpoint: process.env.CLOUDFARE_ENDPOINT,
              credentials: {
                accessKeyId: process.env.CLOUDFARE_ACCESS_KEY_ID,
                secretAccessKey: process.env.CLOUDFARE_SECRET_ACCESS_KEY,
              },
            });

            const uniqueId = Math.random().toString(36).substring(2, 15);
            const fileName = `generated_${Date.now()}_${uniqueId}.jpg`;
            const bucketName = customBucket || 'default-bucket';
            const uploadPath = customPath ? `${customPath}${fileName}` : `ai-images/${fileName}`;

            await s3Client.send(new PutObjectCommand({
              Bucket: bucketName,
              Key: uploadPath,
              Body: buffer,
              ContentType: 'image/jpeg',
            }));

            const baseUrl = customPublicUrlBase || process.env.CLOUDFARE_PUBLIC_URL;
            const publicUrl = `${baseUrl}/${uploadPath}`;

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, publicUrl }));
          } catch (err) {
            console.error('R2 upload error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (req.url === '/api/get-r2-upload-url' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { fileName, contentType, avatarName, type, customBucket, customPath, customPublicUrlBase } = JSON.parse(body);

            if (!fileName || !contentType) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Missing required fields' }));
            }

            const s3Client = new S3Client({
              region: 'auto',
              endpoint: process.env.CLOUDFARE_ENDPOINT,
              credentials: {
                accessKeyId: process.env.CLOUDFARE_ACCESS_KEY_ID,
                secretAccessKey: process.env.CLOUDFARE_SECRET_ACCESS_KEY,
              },
            });

            const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
            let filePath = '';

            if (customPath) {
              filePath = `${customPath}${safeFileName}`;
            } else if (type === 'bgm') {
              filePath = `editing-assets/bgm/${Date.now()}_${safeFileName}`;
            } else {
              if (!avatarName || !userId) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Missing avatarName or userId for avatar upload' }));
              }
              const safeAvatarName = avatarName.replace(/[^a-zA-Z0-9_-]/g, '_');
              filePath = `${safeAvatarName}/${Date.now()}_${safeFileName}`;
            }

            const command = new PutObjectCommand({
              Bucket: customBucket || 'avatar-details',
              Key: filePath,
              ContentType: contentType,
            });

            const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            
            // Use the public r2.dev domain instead of the private API endpoint
            const publicUrlBase = customPublicUrlBase || process.env.CLOUDFARE_PUBLIC_URL || 'https://pub-ec98e9f778e24a0aa8306ee739acdc03.r2.dev';
            const publicUrl = `${publicUrlBase.replace(/\/$/, '')}/${filePath}`;

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ signedUrl, publicUrl }));
          } catch (err) {
            console.error('R2 Plugin Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), r2ApiPlugin(), htmlRewritePlugin()],
  server: {
    proxy: {
      '/r2-assets': {
        target: 'https://pub-2003936f6b0342a8afd9e538b2f27d12.r2.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/r2-assets/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.removeHeader('accept-encoding');
          });
        }
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        dashboard: path.resolve(__dirname, 'dashboard.html'),
        workspace: path.resolve(__dirname, 'workspace.html')
      }
    }
  }
});
