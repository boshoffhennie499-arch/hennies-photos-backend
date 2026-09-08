# Hennie's Photos - Backend Setup Guide

## Prerequisites
- Cloudflare account (free)
- Node.js installed
- Git configured

## Step-by-Step Setup

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Clone this repository
```bash
git clone https://github.com/boshoffhennie499-arch/hennies-photos-backend.git
cd hennies-photos-backend
```

### 4. Create Cloudflare D1 Database
```bash
wrangler d1 create hennies-photos
```

Copy the database ID from the output and update `wrangler.toml`:
```toml
database_id = "your-database-id-here"
```

### 5. Create R2 Bucket (for photo storage)
```bash
wrangler r2 bucket create hennies-photos
```

### 6. Update wrangler.toml with R2 binding
Add this to your `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "hennies-photos"

[env.production]
vars = { R2_PUBLIC_URL = "https://your-bucket-url.r2.cloudflarestorage.com" }
```

### 7. Initialize the Database
```bash
wrangler d1 execute hennies-photos --file schema.sql
```

### 8. Test Locally
```bash
npm run dev
```

Your API will run at: `http://localhost:8787`

### 9. Deploy to Cloudflare
```bash
npm run deploy
```

You'll get a URL like: `https://your-worker-name.your-subdomain.workers.dev`

## Step 10: Update Your HTML

In your `index.html`, replace:
```javascript
const API_URL = '';
```

With:
```javascript
const API_URL = 'https://your-worker-name.your-subdomain.workers.dev';
```

## API Endpoints

### GET /events
Retrieve all events with their photos.

**Response:**
```json
{
  "events": [
    {
      "id": "event_123",
      "name": "Wedding 2024",
      "date": "December 15, 2024",
      "photos": [
        {"id": "PHOTO_1", "src": "https://...", "price": 0}
      ]
    }
  ]
}
```

### POST /events
Create a new event.

**Request body:**
```json
{
  "id": "event_123",
  "name": "Wedding 2024",
  "date": "December 15, 2024"
}
```

### POST /photos
Upload photos to an event.

**Form data:**
- `eventId`: Event ID
- `photos`: Multiple image files

### DELETE /events/:id
Delete an event and all its photos.

## Troubleshooting

### Database not found
- Check your `database_id` in `wrangler.toml`
- Run: `wrangler d1 list` to see all databases

### R2 bucket errors
- Ensure bucket is created: `wrangler r2 bucket list`
- Check binding name matches in code

### CORS errors
- Verify `Access-Control-Allow-Origin: *` headers are set
- Check browser console for specific errors

## Cost

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **D1 Database**: Free tier included
- **R2 Storage**: Free tier includes 10GB/month

Perfect for starting your business!
