import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Import routes
import bookingRoutes from './routes/bookings.js';
import availabilityRoutes from './routes/availability.js';
import userRoutes from './routes/users.js';
import driverRoutes from './routes/drivers.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import diagnosticsRoutes from './routes/diagnostics.js';
import vehiclesRoutes from './routes/vehicles.js';
import promosRoutes from './routes/promos.js';
import getSupabaseClient, { ensureSupabaseConfigured, supabaseOnly } from './services/supabaseClient.js'

// Import middleware
import errorHandler from './middleware/errorHandler.js';
import authMiddleware from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Security middleware
const defaultDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
defaultDirectives["script-src"] = ["'self'", "'unsafe-inline'", "https://unpkg.com"]; 
defaultDirectives["script-src-attr"] = ["'self'", "'unsafe-inline'"];
defaultDirectives["style-src"] = ["'self'", "https:", "'unsafe-inline'"];
defaultDirectives["img-src"] = ["'self'", "data:", "https:"];
defaultDirectives["connect-src"] = [
  "'self'",
  "http://localhost:3001",
  "http://localhost:5173",
  process.env.FRONTEND_URL || "http://localhost:5173",
  process.env.SUPABASE_URL || "https://*.supabase.co"
];
app.use(helmet({ 
  contentSecurityPolicy: { directives: defaultDirectives },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'https://traeqkfjen3z.vercel.app', process.env.FRONTEND_URL],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.path === '/api/admin.js'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Serve static booking site from project root
app.use(express.static(join(__dirname, '../../'), { index: 'index.html' }));

// Also serve files from the repository root to include script-backend.js
app.use(express.static(join(__dirname, '../../../')));

// Explicit root route for booking site
app.get('/', (req, res) => {
  const indexPath = join(__dirname, '../../index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Booking site index.html not found:', err);
      res.status(404).json({
        error: 'Frontend not found',
        message: 'Ensure index.html exists in the project root'
      });
    }
  });
});

// Supabase branding logo bootstrap & serving
async function ensureBrandingLogo() {
  const client = getSupabaseClient(true);
  if (!client) return;
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const hasBucket = Array.isArray(buckets) && buckets.some(b => b.name === 'branding');
    if (!hasBucket) {
      await client.storage.createBucket('branding', { public: true, fileSizeLimit: '2MB' });
    }
    const { data: files } = await client.storage.from('branding').list('', { limit: 100 });
    const hasLogo = Array.isArray(files) && files.some(f => f.name === 'logo.svg');
    if (!hasLogo) {
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'><defs><linearGradient id='g1' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#22c55e'/><stop offset='1' stop-color='#0ea5e9'/></linearGradient><linearGradient id='g2' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#06b6d4'/><stop offset='1' stop-color='#1e40af'/></linearGradient></defs><text x='20' y='50' font-family='Inter,Segoe UI,Arial,sans-serif' font-weight='800' font-size='40' fill='url(#g1)'>CG</text><text x='95' y='50' font-family='Inter,Segoe UI,Arial,sans-serif' font-weight='800' font-size='40' fill='url(#g2)'>cabz</text><path d='M20 60 C60 40 100 70 140 50 C170 40 200 55 220 45 L220 68 L20 68 Z' fill='url(#g2)' opacity='0.85'/><path d='M20 64 C60 48 100 72 140 56 C170 48 200 60 220 52' stroke='url(#g1)' stroke-width='4' fill='none' opacity='0.9'/></svg>";
      await client.storage.from('branding').upload('logo.svg', Buffer.from(svg, 'utf8'), { contentType: 'image/svg+xml', upsert: true });
    }
  } catch (e) {
    console.error('Failed to ensure branding logo in Supabase', e);
  }
}

app.get('/assets/logo.svg', async (req, res) => {
  try {
    const client = getSupabaseClient(false);
    if (!client) return res.status(404).send('Supabase not configured');
    const p1 = client.storage.from('branding').getPublicUrl('logo.svg');
    const p2 = client.storage.from('branding').getPublicUrl('logo.png');
    const url = (p1?.data?.publicUrl) || (p2?.data?.publicUrl);
    if (url) { return res.redirect(url); }
    return res.status(404).send('Logo not found');
  } catch (e) {
    console.error('Error serving Supabase logo', e);
    res.status(500).send('Error serving logo');
  }
});

app.post('/api/assets/logo', async (req, res) => {
  try {
    const client = getSupabaseClient(true);
    if (!client) return res.status(404).json({ error: 'Supabase not configured' });
    const { data: buckets } = await client.storage.listBuckets();
    const hasBucket = Array.isArray(buckets) && buckets.some(b => b.name === 'branding');
    if (!hasBucket) {
      await client.storage.createBucket('branding', { public: true, fileSizeLimit: '4MB' });
    }
    const { filename = 'logo.png', data: payload } = req.body || {};
    if (!payload) return res.status(400).json({ error: 'Missing image data (base64 or data URL)' });
    let base64 = payload;
    let contentType = 'image/png';
    const m = /^data:(.+);base64,(.*)$/i.exec(base64);
    if (m) { contentType = m[1]; base64 = m[2]; }
    const buffer = Buffer.from(base64, 'base64');
    await client.storage.from('branding').upload(filename, buffer, { contentType, upsert: true });
    const { data } = client.storage.from('branding').getPublicUrl(filename);
    return res.json({ publicUrl: data?.publicUrl, path: filename });
  } catch (e) {
    console.error('Upload logo error', e);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', authMiddleware.authenticateToken, authMiddleware.requireAdmin, adminRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/promos', promosRoutes);

// Admin redirect - serve admin.html for /admin route
app.get('/admin', (req, res) => {
  const primary = join(__dirname, '../../Airport Raipur cab service/admin.html');
  const fallback = join(__dirname, '../../admin.html');
  const target = existsSync(primary) ? primary : fallback;
  res.sendFile(target, (err) => {
    if (err && target !== fallback && existsSync(fallback)) {
      return res.sendFile(fallback);
    }
    if (err) {
      res.status(404).json({ 
        error: 'Admin panel not found',
        message: 'Please ensure admin.html exists in the project'
      });
    }
  });
});

// Serve admin.html directly for compatibility with /admin.html path
app.get('/admin.html', (req, res) => {
  const primary = join(__dirname, '../../Airport Raipur cab service/admin.html');
  const fallback = join(__dirname, '../../admin.html');
  const target = existsSync(primary) ? primary : fallback;
  res.sendFile(target, (err) => {
    if (err && target !== fallback && existsSync(fallback)) {
      return res.sendFile(fallback);
    }
    if (err) {
      res.status(404).json({ 
        error: 'Admin panel not found',
        message: 'Please ensure admin.html exists in the project'
      });
    }
  });
});

// Serve admin client script for backend-served admin page
app.get('/api/admin.js', (req, res) => {
  const jsPath = join(__dirname, '../../api/admin.js');
  res.sendFile(jsPath, (err) => {
    if (err) {
      console.error('Admin JS not found:', err);
      res.status(404).json({ 
        error: 'Admin JS not found',
        message: 'Please ensure api/admin.js exists in the project'
      });
    }
  });
});

// Serve booking frontend script (script-backend.js) from project root
app.get('/script-backend.js', (req, res) => {
  const scriptPath = join(__dirname, '../../../script-backend.js');
  res.sendFile(scriptPath, (err) => {
    if (err) {
      console.error('Booking script not found:', err);
      res.status(404).json({
        error: 'Frontend script not found',
        message: 'Ensure script-backend.js exists in the project root'
      });
    }
  });
});

// Also expose under /api/script-backend.js for explicit same-origin loading
app.get('/api/script-backend.js', (req, res) => {
  const scriptPath = join(__dirname, '../../../script-backend.js');
  res.sendFile(scriptPath, (err) => {
    if (err) {
      console.error('Booking script not found:', err);
      res.status(404).json({
        error: 'Frontend script not found',
        message: 'Ensure script-backend.js exists in the project root'
      });
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Airport Booking Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  ensureBrandingLogo();
  if (supabaseOnly) {
    const client = getSupabaseClient(true)
    if (!client) {
      console.error('Supabase-only mode active but client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    } else {
      console.log('✅ Supabase-only mode active')
    }
  }
});

export default app;
// Supabase-only mode guard
try {
  ensureSupabaseConfigured()
} catch (e) {
  console.error(e.message)
}
