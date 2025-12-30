# Google Maps Integration Note

## API Key Required

To use the Google Maps integration feature, you need to:

1. **Get a Google Maps API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API
   - Create credentials (API Key)
   - Restrict the key to your domain for security

2. **Replace the placeholder in index.html**:
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places"></script>
   ```
   Replace `YOUR_API_KEY` with your actual API key.

## Without API Key (Alternative)

If you don't want to use Google Maps, the app will still work perfectly with manual address input. Users can simply type their pickup and drop-off addresses in the text fields.

## Features with Google Maps

- **Interactive Map**: Click anywhere to select pickup location
- **Search Functionality**: Search for specific addresses or places
- **Automatic Address Detection**: Get formatted addresses from coordinates
- **Visual Location Selection**: See the exact pickup point on map

## Cost Consideration

Google Maps API has a free tier, but charges apply after certain usage limits. For a small local business, the free tier should be sufficient.

## Alternative Map Services

If you prefer alternatives to Google Maps:
- **OpenStreetMap** with Leaflet.js (completely free)
- **Mapbox** (free tier available)
- **Here Maps** (free tier available)

The current implementation uses Google Maps as it's the most user-friendly and feature-rich option.