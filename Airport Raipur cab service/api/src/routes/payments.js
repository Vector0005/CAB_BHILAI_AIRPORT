import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key');

// Create payment intent
router.post('/create-intent', [
  body('bookingId').isString().withMessage('Booking ID required'),
  body('amount').isFloat({ min: 1 }).withMessage('Valid amount required'),
  body('currency').isIn(['inr', 'usd']).withMessage('Valid currency required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookingId, amount, currency = 'inr' } = req.body;

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.paymentStatus === 'PAID') {
      return res.status(400).json({ error: 'Booking already paid' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency: currency,
      metadata: {
        bookingId: bookingId,
        bookingNumber: booking.bookingNumber
      },
      description: `Airport Taxi Booking - ${booking.bookingNumber}`
    });

    // Update booking with payment intent ID
    await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'PENDING'
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment
router.post('/confirm', [
  body('paymentIntentId').isString().withMessage('Payment intent ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentIntentId } = req.body;

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update booking payment status
      const booking = await prisma.booking.update({
        where: { paymentIntentId },
        data: { 
          paymentStatus: 'PAID',
          status: 'CONFIRMED'
        }
      });

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          paymentStatus: booking.paymentStatus,
          status: booking.status
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get payment status
router.get('/status/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const booking = await prisma.booking.findUnique({
      where: { paymentIntentId },
      select: { 
        id: true, 
        bookingNumber: true, 
        paymentStatus: true,
        status: true,
        price: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      paymentIntentId,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      booking: booking
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

// Process refund
router.post('/refund', [
  body('bookingId').isString().withMessage('Booking ID required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Valid refund amount')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { bookingId, amount } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.paymentStatus !== 'PAID') {
      return res.status(400).json({ error: 'Booking not paid or already refunded' });
    }

    if (!booking.paymentIntentId) {
      return res.status(400).json({ error: 'No payment intent found' });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: booking.paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Full refund if no amount specified
      reason: 'requested_by_customer'
    });

    // Update booking status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        paymentStatus: 'REFUNDED',
        status: 'CANCELLED'
      }
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Update booking status
      await prisma.booking.update({
        where: { paymentIntentId: paymentIntent.id },
        data: { 
          paymentStatus: 'PAID',
          status: 'CONFIRMED'
        }
      });
      
      console.log('Payment succeeded:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      
      // Update booking status
      await prisma.booking.update({
        where: { paymentIntentId: failedPayment.id },
        data: { 
          paymentStatus: 'FAILED'
        }
      });
      
      console.log('Payment failed:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;