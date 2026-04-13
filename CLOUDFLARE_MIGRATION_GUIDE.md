# Campus Event Manager - Cloudflare Workers Migration Guide

## Overview

This guide covers migrating from the Express backend (localhost:5000) to a serverless Cloudflare Workers backend using Hono.

**Key Changes:**
- Express.js → Cloudflare Workers + Hono
- Nodemailer (Gmail) → SendGrid
- Traditional Node.js server → Serverless function
- Database: MongoDB Atlas (unchanged)
- Frontend: Updated API URLs

## Architecture Changes

### Before (Current)
```
Frontend (localhost:5500) 
    ↓
Express Server (localhost:5000)
    ↓
MongoDB Atlas + Gmail SMTP
```

### After (New)
```
Frontend (Pages Dev Domain or Cloudflare Pages)
    ↓  
Cloudflare Workers API (https://api.campuseventmanager.com)
    ↓
MongoDB Atlas + SendGrid
```

## Step 1: Install Dependencies

### Install Wrangler CLI
```bash
npm install -g wrangler
```

### Install Worker Project Dependencies
```bash
cd /workspaces/CampusEventManager/worker-backend
npm install
```

## Step 2: Setup SendGrid

### Get Your SendGrid API Key
1. Go to [SendGrid](https://sendgrid.com/)
2. Create an account or login
3. Navigate to **Settings** → **API Keys**
4. Create a new API key with "Full Access"
5. Copy the key (you won't see it again)

### Verify Sender Email
1. Go to **Settings** → **Sender Authentication**
2. Verify a domain or email address you'll use as the sender
3. Use this email as `SENDER_EMAIL`

## Step 3: Configure Cloudflare Workers

### Login to Cloudflare
```bash
wrangler login
```

This will open a browser to authenticate with Cloudflare.

### Create a New Workers Project (Optional)
If you don't have a Cloudflare project yet, Wrangler will create one during deployment.

## Step 4: Set Environment Variables

### For Local Development
Update `.dev.vars` in `worker-backend/`:
```bash
MONGODB_URI="mongodb+srv://YOUR_USER:YOUR_PASS@YOUR_CLUSTER.mongodb.net/?appName=CampusEventManager"
DB_NAME="CampusEventManager"
JWT_SECRET="your_jwt_secret_change_in_production"
SENDGRID_API_KEY="SG.your_actual_sendgrid_key_here"
SENDER_EMAIL="noreply@yourdomain.com"
NODE_ENV="development"
```

### For Cloudflare Production
```bash
wrangler secret put SENDGRID_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put MONGODB_URI
```

Then set non-secret variables in `wrangler.toml`:
```toml
[vars]
DB_NAME = "CampusEventManager"
SENDER_EMAIL = "noreply@yourdomain.com"
NODE_ENV = "production"
```

## Step 5: Test Locally

```bash
cd worker-backend
npm run dev
```

The API will be available at `http://localhost:8787`

**Test endpoints:**
```bash
# Health check
curl http://localhost:8787/api/health

# Register user
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123","role":"student"}'

# Login
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'
```

## Step 6: Frontend Configuration

The frontend automatically detects the environment:
- **Local development** → `http://localhost:8787`
- **Production** → `https://api.campuseventmanager.com`

Location of changes:
- File: `/Main Page/app.js`
- Change: Lines 5-11 (API_BASE_URL detection)

For a custom API URL, update:
```javascript
const API_BASE_URL = 'https://your-api-url.com';
```

## Step 7: Deploy to Cloudflare Workers

### Update wrangler.toml
```toml
name = "campus-event-manager-worker"
main = "src/index.js"
compatibility_date = "2023-12-01"

# Your Cloudflare account ID
account_id = "YOUR_ACCOUNT_ID"

# Your Cloudflare zone ID (if using custom domain)
routes = [
  { pattern = "api.campuseventmanager.com/*", zone_id = "YOUR_ZONE_ID" }
]
```

### Deploy
```bash
cd worker-backend
npm run deploy
```

Your API will be live at your Worker's default URL or custom domain.

## Step 8: Update Cloudflare Pages Frontend

### Deploy Frontend to Pages
The frontend is in `/Main Page/` directory.

1. Go to **Cloudflare Dashboard** → **Pages**
2. Create a new project
3. Connect your GitHub repo or upload manually
4. Build settings:
   - **Framework preset:** None
   - **Build command:** (leave blank)
   - **Build output directory:** `Main Page`

### Configure CORS
The Worker's CORS settings include:
```javascript
origin: [
  'https://*.pages.dev',
  'https://campuseventmanager.pages.dev'
]
```

If your frontend is on a different domain, add it to `src/index.js`.

## Step 9: Database Verification

Ensure your MongoDB Atlas connection is working:

```bash
# Test from local development
npm run dev

# MongoDB should connect automatically
# Check logs for: "✓ MongoDB connected: ..."
```

### IP Whitelist
MongoDB Atlas requires IP whitelisting for Cloudflare Workers:
1. Go to **MongoDB Atlas** → **Network Access**
2. Add **0.0.0.0/0** to allow all IPs (for Workers)
3. **Or** add Cloudflare's IP ranges if you want to be more restrictive

## Step 10: Testing All Endpoints

Use the included test scenarios to verify everything works:

```bash
# Register
curl -X POST https://your-worker-url/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "student"
  }'

# Login to get token
TOKEN=$(curl -s -X POST https://your-worker-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' \
  | jq -r '.data.token')

# Create event (as organizer)
curl -X POST https://your-worker-url/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "description": "This is a test event description",
    "date": "2026-05-15",
    "time": "14:00",
    "location": "Room 101",
    "category": "technology"
  }'

# Get events
curl https://your-worker-url/api/events
```

## Troubleshooting

### MongoDB Connection Fails
```
Error: MongoDB connection failed
```
**Solution:**
- Check `.dev.vars` or Cloudflare secrets
- Verify IP whitelist in MongoDB Atlas
- Ensure `DB_NAME` matches your actual database name

### SendGrid Email Fails
```
Error: Failed to send email
```
**Solution:**
- Verify API key is correct: `wrangler secret list`
- Check sender email is verified in SendGrid
- Review SendGrid account for bounce/reject reasons

### CORS Errors
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Solution:**
- Add frontend origin to CORS in `src/index.js`
- Redeploy: `npm run deploy`

### Authentication Fails
```
Invalid token
```
**Solution:**
- Verify JWT_SECRET is same in dev and production
- Check token isn't expired (7 days max)
- Ensure Authorization header format: `Bearer <token>`

## Performance Optimization

Cloudflare Workers Benefits:
- ✅ Auto-scales with traffic
- ✅ Global distribution (50+ data centers)
- ✅ Fast response times (<100ms)
- ✅ Always included in Cloudflare plan

### Monitoring
View logs and analytics in Cloudflare Dashboard:
- **Analytics** → **Workers** → Your Worker
- See request volume, latency, errors

## Security Best Practices

1. **Change JWT_SECRET in production**
   ```bash
   wrangler secret put JWT_SECRET
   ```

2. **Use SendGrid API keys with limited scope**
   - Mail Send only, not admin access

3. **Enable Workers Routes Protection**
   - Require authentication for sensitive endpoints
   - Admin endpoints already require admin role

4. **Monitor SendGrid Usage**
   - Set alerts for unusual email volume
   - Review bounce rates in SendGrid dashboard

5. **Regular Backups**
   - Export MongoDB collections regularly
   - Store backups outside MongoDB Atlas

## Rolling Back to Express

If you need to revert to the old Express backend:

1. Keep the old `backend/` directory as-is
2. Update `API_BASE_URL` in `/Main Page/app.js`:
   ```javascript
   const API_BASE_URL = 'http://localhost:5000';
   ```
3. Start Express server: `cd backend && npm install && npm start`

## Next Steps

1. **Monitor your Worker:** Check Cloudflare dashboard daily for first week
2. **Test in production:** Register a user, create event, send email
3. **Setup alerts:** Configure Cloudflare alerts for high error rates
4. **Document custom domains:** If using custom API domain, document DNS records
5. **Plan scaling:** For large deployments, consider R2 storage for uploads

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev)
- [Mongoose Documentation](https://mongoosejs.com)
- [SendGrid API Docs](https://docs.sendgrid.com/)

## Summary

Your application is now:
- ✅ Serverless and auto-scaling
- ✅ Globally distributed
- ✅ Using professional email service (SendGrid)
- ✅ Secure with JWT authentication
- ✅ Connected to MongoDB Atlas

All endpoints remain the same, just the backend infrastructure has been modernized!
