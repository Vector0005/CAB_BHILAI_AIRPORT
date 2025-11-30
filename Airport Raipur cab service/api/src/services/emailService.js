import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email transporter ready');
  }
});

// Send booking confirmation email
export const sendBookingConfirmation = async (bookingData) => {
  try {
    const {
      bookingNumber,
      name,
      email,
      phone,
      pickupLocation,
      dropoffLocation,
      pickupDate,
      pickupTime,
      tripType,
      price,
      driver
    } = bookingData;

    const formattedDate = new Date(pickupDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const timeSlot = pickupTime === 'morning' 
      ? 'Morning (6:00 AM - 12:00 PM)'
      : 'Evening (12:00 PM - 10:00 PM)';

    const tripTypeText = tripType === 'HOME_TO_AIRPORT' 
      ? 'Home to Airport'
      : 'Airport to Home';

    const mailOptions = {
      from: `"Raipur Airport Taxi" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Booking Confirmed - ${bookingNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9, #1e40af); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #374151; }
            .value { color: #6b7280; }
            .total { font-size: 18px; font-weight: bold; color: #0ea5e9; }
            .footer { text-align: center; margin-top: 20px; padding: 15px; background: #e0f2fe; border-radius: 8px; }
            .contact { margin-top: 15px; font-size: 14px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 Booking Confirmed!</h1>
              <p>Your airport taxi booking has been confirmed</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              <p>Thank you for booking with Raipur Airport ↔ Bhilai Travel Service. Your booking has been confirmed with the following details:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="label">Booking Number:</span>
                  <span class="value">${bookingNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Pickup Date:</span>
                  <span class="value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Pickup Time:</span>
                  <span class="value">${timeSlot}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Trip Type:</span>
                  <span class="value">${tripTypeText}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Pickup Location:</span>
                  <span class="value">${pickupLocation}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Dropoff Location:</span>
                  <span class="value">${dropoffLocation}</span>
                </div>
                ${driver ? `
                <div class="detail-row">
                  <span class="label">Driver:</span>
                  <span class="value">${driver.name} - ${driver.phone}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Vehicle:</span>
                  <span class="value">${driver.vehicle} (${driver.vehicleNo})</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="label">Total Amount:</span>
                  <span class="value total">₹${price}</span>
                </div>
              </div>

              <div class="footer">
                <p><strong>Important Notes:</strong></p>
                <ul style="text-align: left; margin: 10px 0;">
                  <li>Please be ready 15 minutes before the pickup time</li>
                  <li>Keep your phone accessible for driver coordination</li>
                  <li>Contact us for any changes or cancellations</li>
                </ul>
              </div>

              <div class="contact">
                <p><strong>Contact Information:</strong></p>
                <p>📞 Phone: +91-98271-98271</p>
                <p>📧 Email: support@raipurtaxi.com</p>
                <p>🌐 Website: www.raipurtaxi.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Booking confirmation email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending booking confirmation email:', error);
    throw error;
  }
};

// Send booking cancellation email
export const sendBookingCancellation = async (bookingData) => {
  try {
    const {
      bookingNumber,
      name,
      email,
      pickupDate,
      refundAmount
    } = bookingData;

    const formattedDate = new Date(pickupDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: `"Raipur Airport Taxi" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Booking Cancelled - ${bookingNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #374151; }
            .value { color: #6b7280; }
            .refund { color: #22c55e; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; padding: 15px; background: #fee2e2; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Booking Cancelled</h1>
              <p>Your airport taxi booking has been cancelled</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              <p>Your booking has been cancelled as requested. Here are the details:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="label">Booking Number:</span>
                  <span class="value">${bookingNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Pickup Date:</span>
                  <span class="value">${formattedDate}</span>
                </div>
                ${refundAmount ? `
                <div class="detail-row">
                  <span class="label">Refund Amount:</span>
                  <span class="value refund">₹${refundAmount}</span>
                </div>
                ` : ''}
              </div>

              <div class="footer">
                <p>We apologize for any inconvenience. You can book again anytime through our website.</p>
                <p>If you have any questions, please contact us at +91-98271-98271</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Booking cancellation email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending booking cancellation email:', error);
    throw error;
  }
};

// Send booking reminder email
export const sendBookingReminder = async (bookingData) => {
  try {
    const {
      bookingNumber,
      name,
      email,
      phone,
      pickupLocation,
      dropoffLocation,
      pickupDate,
      pickupTime,
      tripType,
      driver
    } = bookingData;

    const formattedDate = new Date(pickupDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const timeSlot = pickupTime === 'morning' 
      ? 'Morning (6:00 AM - 12:00 PM)'
      : 'Evening (12:00 PM - 10:00 PM)';

    const tripTypeText = tripType === 'HOME_TO_AIRPORT' 
      ? 'Home to Airport'
      : 'Airport to Home';

    const mailOptions = {
      from: `"Raipur Airport Taxi" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Reminder: Your booking ${bookingNumber} is tomorrow`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 10px 10px; }
            .booking-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #374151; }
            .value { color: #6b7280; }
            .footer { text-align: center; margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Booking Reminder</h1>
              <p>Your airport taxi booking is scheduled for tomorrow</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              <p>This is a friendly reminder that your airport taxi booking is scheduled for tomorrow. Please find the details below:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="label">Booking Number:</span>
                  <span class="value">${bookingNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Pickup Date:</span>
                  <span class="value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Pickup Time:</span>
                  <span class="value">${timeSlot}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Trip Type:</span>
                  <span class="value">${tripTypeText}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Pickup Location:</span>
                  <span class="value">${pickupLocation}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Dropoff Location:</span>
                  <span class="value">${dropoffLocation}</span>
                </div>
                ${driver ? `
                <div class="detail-row">
                  <span class="label">Driver:</span>
                  <span class="value">${driver.name} - ${driver.phone}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Vehicle:</span>
                  <span class="value">${driver.vehicle} (${driver.vehicleNo})</span>
                </div>
                ` : ''}
              </div>

              <div class="footer">
                <p><strong>Important Reminders:</strong></p>
                <ul style="text-align: left; margin: 10px 0;">
                  <li>Please be ready 15 minutes before the pickup time</li>
                  <li>Keep your phone accessible for driver coordination</li>
                  <li>Have your booking confirmation ready</li>
                  <li>Contact us if you need to make any changes</li>
                </ul>
                <p>Safe travels! 🚗</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Booking reminder email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending booking reminder email:', error);
    throw error;
  }
};

export default {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingReminder
};