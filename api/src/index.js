import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import bookingRoutes from './routes/bookings.js';
import availabilityRoutes from './routes/availability.js';
import userRoutes from './routes/users.js';
import driverRoutes from './routes/drivers.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import diagnosticsRoutes from './routes/diagnostics.js';
import vehiclesRoutes from './routes/vehicles.js';
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
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', process.env.FRONTEND_URL],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

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
app.use('/api/admin', adminRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/api/vehicles', vehiclesRoutes);

// Admin redirect - serve admin.html for /admin route
app.get('/admin', (req, res) => {
  const adminPath = join(__dirname, '../../admin.html');
  res.sendFile(adminPath, (err) => {
    if (err) {
      console.error('Admin file not found:', err);
      res.status(404).json({ 
        error: 'Admin panel not found',
        message: 'Please ensure admin.html exists in the root directory'
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
