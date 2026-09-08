# Hennie's Photos - Backend API

Cloudflare Workers backend for the Hennie's Photos proofing platform.

## Features

✅ Serverless architecture (Cloudflare Workers)
✅ SQLite database (Cloudflare D1)
✅ Object storage (Cloudflare R2)
✅ CORS enabled
✅ Free tier friendly

## Quick Start

1. Read [SETUP.md](./SETUP.md) for complete setup instructions
2. Deploy with `npm run deploy`
3. Update your HTML with the Worker URL

## Architecture

```
Hennie's Photos (Frontend)
        ↓
Cloudflare Workers (API)
        ↓
    ┌───┴───┐
    ↓       ↓
  D1 DB   R2 Storage
```

## Documentation

See [SETUP.md](./SETUP.md) for detailed API documentation.
