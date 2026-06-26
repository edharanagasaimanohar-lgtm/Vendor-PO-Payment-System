import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import app from './app.js';
import { initDb } from './config/db.js';
import fs from 'fs';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Generate public assets (favicons, chrome-icons, manifest) if not exists
try {
  const publicDir = path.resolve('./public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const masterSource = path.resolve('./frontend/src/assets/images/paper_plane_logo_1782193203592.jpg');
  if (fs.existsSync(masterSource)) {
    const fileBytes = fs.readFileSync(masterSource);
    const targetPaths = [
      'favicon.ico',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'android-chrome-192x192.png',
      'android-chrome-512x512.png'
    ];
    for (const filename of targetPaths) {
      const fullDest = path.join(publicDir, filename);
      // Make sure the files exist and are populated
      fs.writeFileSync(fullDest, fileBytes);
    }

    const manifestContent = {
      short_name: "Paper Plane",
      name: "Paper Plane Procurement SaaS",
      icons: [
        {
          src: "/favicon.ico",
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon"
        },
        {
          src: "/android-chrome-192x192.png",
          type: "image/png",
          sizes: "192x192"
        },
        {
          src: "/android-chrome-512x512.png",
          type: "image/png",
          sizes: "512x512"
        }
      ],
      start_url: ".",
      display: "standalone",
      theme_color: "#000000",
      background_color: "#ffffff"
    };
    fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifestContent, null, 2));
    console.log('[Success] Automatically generated public directory and all brand assets on boot!');
  } else {
    console.warn(`[Warning] Master logo image not found at ${masterSource}`);
  }
} catch (err) {
  console.error('Error generating public assets on boot:', err);
}

async function startServer() {
  // Connect & prep SQL Database
  try {
    await initDb();
  } catch (err) {
    console.error('Error during database initialization:', err);
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', datetime: new Date().toISOString() });
  });

  // Client-SPA integration: mount Vite middleware in Development or Serve static dist in Production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in DEVELOPMENT mode. Mounting Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode. Serving pre-compiled static files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Paper Plane System Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server starter crashed:', error);
});
