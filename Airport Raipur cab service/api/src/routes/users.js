import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import getSupabaseClient from '../services/supabaseClient.js'
import { PrismaClient } from '@prisma/client'
import { body, validationResult } from 'express-validator';

const router = express.Router();
const supabase = getSupabaseClient(true)
const prisma = new PrismaClient()

// Register new user
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password } = req.body;

    // Check if user already exists (email or phone)
    let exists = false
    if (supabase) {
      const { data: existingByEmail } = await supabase.from('users').select('id').eq('email', email).limit(1)
      const { data: existingByPhone } = await supabase.from('users').select('id').eq('phone', phone).limit(1)
      exists = (existingByEmail && existingByEmail.length) || (existingByPhone && existingByPhone.length)
    } else {
      const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } })
      exists = !!existingUser
    }

    if (exists) {
      return res.status(400).json({ 
        error: 'User already exists with this email or phone number' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Supabase
    let user
    if (supabase) {
      const payload = { id: crypto.randomUUID(), name, email, phone, password: hashedPassword, role: 'CUSTOMER' }
      const { data: rows, error } = await supabase.from('users').insert(payload).select('id,name,email,phone,role,created_at').limit(1)
      if (error) throw error
      user = rows[0]
    } else {
      user = await prisma.user.create({
        data: { name, email, phone, password: hashedPassword, role: 'CUSTOMER' },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').exists().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    let user
    if (supabase) {
      const { data: rows } = await supabase.from('users').select('*').eq('email', email).limit(1)
      user = rows && rows.length ? rows[0] : null
    } else {
      user = await prisma.user.findUnique({ where: { email } })
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    let user
    if (supabase) {
      const { data: rows } = await supabase.from('users').select('id,name,email,phone,role,created_at').eq('id', decoded.userId).limit(1)
      user = rows && rows.length ? rows[0] : null
    } else {
      user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } })
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get user's bookings
router.get('/bookings', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user's bookings
    let bookings
    if (supabase) {
      const { data } = await supabase.from('bookings').select('*').eq('user_id', decoded.userId).order('created_at', { ascending: false })
      bookings = data || []
    } else {
      bookings = await prisma.booking.findMany({ where: { userId: decoded.userId }, orderBy: { createdAt: 'desc' } })
    }

    res.json({ bookings });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Update user profile
router.patch('/profile', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const { name, phone } = req.body;
    
    // Update user
    let user
    if (supabase) {
      const { data: rows } = await supabase.from('users').update({ name, phone }).eq('id', decoded.userId).select('id,name,email,phone,role,created_at')
      user = rows[0]
    } else {
      user = await prisma.user.update({ where: { id: decoded.userId }, data: { name, phone }, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } })
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
