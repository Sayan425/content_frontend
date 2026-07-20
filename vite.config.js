import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// The workspace fetches /components/*.html at runtime, so those files
// must exist in the deployed output — copy them into dist after build.
function copyComponentHtml() {
  return {
    name: 'copy-component-html',
    closeBundle() {
      const srcDir = path.resolve(__dirname, 'components');
      const outDir = path.resolve(__dirname, 'dist', 'components');
      fs.mkdirSync(outDir, { recursive: true });
      for (const file of fs.readdirSync(srcDir)) {
        if (file.endsWith('.html')) {
          fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyComponentHtml()],
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
