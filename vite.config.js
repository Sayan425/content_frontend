import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
        const tools = ['idea-labs', 'script-room', 'production-queue', 'edit-queue', 'avatar-studio', 'edit-suite', 'completed-videos', 'analytics', 'profile-settings', 'kanban-board'];
        
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

// Drop `..`/`.`/empty segments and illegal characters so a client-supplied
// path can never escape its intended folder in the bucket.
const sanitizeR2Path = (p) => String(p)
  .split('/')
  .filter(seg => seg && seg !== '.' && seg !== '..')
  .map(seg => seg.replace(/[^a-zA-Z0-9 _.\-()%]/g, '_'))
  .join('/');

const r2ApiPlugin = () => ({
  name: 'r2-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/delete-r2-object' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { publicUrl, customBucket } = JSON.parse(body);
            if (!publicUrl) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Missing publicUrl' }));
            }

            // The object key is the URL path without the leading slash.
            const key = decodeURIComponent(new URL(publicUrl).pathname.replace(/^\//, ''));
            if (!key) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Could not derive object key from URL' }));
            }

            const s3Client = new S3Client({
              region: 'auto',
              endpoint: process.env.CLOUDFARE_ENDPOINT,
              credentials: {
                accessKeyId: process.env.CLOUDFARE_ACCESS_KEY_ID,
                secretAccessKey: process.env.CLOUDFARE_SECRET_ACCESS_KEY,
              },
            });

            await s3Client.send(new DeleteObjectCommand({
              Bucket: customBucket || 'video-folder',
              Key: key,
            }));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, deletedKey: key }));
          } catch (err) {
            console.error('R2 delete error:', err);
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
            const { fileName, contentType, avatarName, userId, type, customBucket, customPath, customPublicUrlBase } = JSON.parse(body);

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
              const safePath = sanitizeR2Path(customPath);
              filePath = safePath ? `${safePath}/${safeFileName}` : safeFileName;
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
      },
      // Motion-graphics bucket (holds the .tsx composition files). Separate
      // bucket from /r2-assets, proxied in dev to avoid browser CORS on fetch.
      '/mg-assets': {
        target: 'https://pub-345e8414642f4b00859c994c81be94de.r2.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mg-assets/, ''),
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
