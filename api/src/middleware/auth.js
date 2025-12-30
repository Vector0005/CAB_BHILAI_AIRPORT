import jwt from 'jsonwebtoken';
import getSupabaseClient from '../services/supabaseClient.js'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const supabase = getSupabaseClient(true)

// Verify JWT token and attach user to request
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user from Supabase
    let user
    if (supabase) {
      const { data: rows, error } = await supabase.from('users').select('id,name,email,phone,role').eq('id', decoded.userId).limit(1)
      if (error) throw error
      user = rows && rows.length ? rows[0] : null
    } else {
      user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, name: true, email: true, phone: true, role: true } })
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check if user is admin
export const requireAdmin = (req, res, next) => {
  if (!req.user || String(req.user.role || '').toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is driver
export const requireDriver = (req, res, next) => {
  if (!req.user || req.user.role !== 'DRIVER') {
    return res.status(403).json({ error: 'Driver access required' });
  }
  next();
};

// Check if user is admin or driver
export const requireAdminOrDriver = (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DRIVER')) {
    return res.status(403).json({ error: 'Admin or driver access required' });
  }
  next();
};

export default {
  authenticateToken,
  requireAdmin,
  requireDriver,
  requireAdminOrDriver
};
