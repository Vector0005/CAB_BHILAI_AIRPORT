# Bhilai Airport Travel Service Web App

A simple, mobile-friendly web application for managing airport travel bookings between Bhilai, Durg, and Raipur Airport.

## Features

### User Features
- **Monthly Calendar View**: Visual calendar showing booking availability
- **Booking Status**: Each day shows ✅ Available or ❌ Booked status
- **Two Daily Slots**: 
  - Morning Trip (6 AM - 12 PM)
  - Evening/Night Trip (12 PM - 10 PM)
- **Simple Booking Form**: Name, phone number, pickup and drop locations
- **Responsive Design**: Works perfectly on mobile devices

### Admin Features
- **Manual Booking**: Mark dates/slots as booked manually
- **View Bookings**: See all upcoming bookings
- **Availability Management**: Mark booked slots as available

## How to Use

### For Customers
1. Open `index.html` in your web browser
2. Navigate through months using the arrow buttons
3. Click on an available date (green background)
4. Fill in the booking form with your details
5. Select pickup and drop locations (Bhilai, Durg, Nandini, Raipur Airport)
6. Choose morning or evening slot
7. Submit the form to confirm your booking

### For Admin
1. Click on "Admin Panel" tab
2. Select a date and slot
3. Use "Mark as Booked" to manually block a slot
4. Use "Mark as Available" to free up a slot
5. View all upcoming bookings in the list below

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Data Storage**: LocalStorage (no backend required)
- **Responsive**: Mobile-first design with CSS Grid and Flexbox
- **No Dependencies**: Pure vanilla JavaScript, no external libraries

## File Structure

```
├── index.html      # Main HTML structure
├── styles.css      # CSS styling and responsive design
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## Booking Data Format

Bookings are stored in localStorage with the following structure:
```javascript
{
  "2024-01-15": {
    "morning": {
      id: 1234567890,
      name: "John Doe",
      phone: "9876543210",
      pickup: "Bhilai",
      drop: "Raipur Airport",
      date: "2024-01-15",
      slot: "morning",
      timestamp: "2024-01-01T10:30:00.000Z"
    }
  }
}
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Customization

You can easily customize:
- Service area locations in the dropdown menus
- Time slots (morning/evening hours)
- Color scheme in CSS
- Booking form fields
- Calendar styling

## Notes

- Data is stored locally in the browser
- Bookings persist until localStorage is cleared
- No payment integration (manual payment handling)
- Perfect for small-scale operations

## Getting Started

1. Download all files to a folder
2. Open `index.html` in any modern web browser
3. Start booking trips!

No server setup or installation required - it works completely offline.