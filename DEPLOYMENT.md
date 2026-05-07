# 🚀 OBA Holdings Deployment Guide

## Live Deployment Steps

### 1. Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub account (recommended)
3. Verify your email

### 2. Deploy Your Application
1. Click "New Project" → "Deploy from GitHub repo"
2. Connect your GitHub account
3. Select this repository
4. Click "Deploy"

### 3. Set Environment Variables
In Railway dashboard, go to your project → Variables:
```
NODE_ENV=production
API_KEY=oba-holdings-secure-api-key-2026
SQUARE_ACCESS_TOKEN=your-square-access-token-here
SQUARE_APP_ID=your-square-app-id-here
SQUARE_ENVIRONMENT=sandbox
```

### 4. Set Up Custom Domain
1. Go to your project → Settings → Domains
2. Add `www.oba-holdings.com`
3. Railway will provide DNS records to configure with your domain registrar

### 5. Database Setup
Railway will automatically create a PostgreSQL database. Update your code to use Railway's DATABASE_URL environment variable instead of SQLite for production.

## Domain Configuration
Contact your domain registrar (GoDaddy, Namecheap, etc.) and add these DNS records:
- **Type:** CNAME
- **Name:** www
- **Value:** [Railway will provide this value]
- **TTL:** 300

## SSL Certificate
Railway automatically provides SSL certificates - no additional setup needed!

## Testing
Once deployed:
1. Visit https://www.oba-holdings.com
2. Test order creation and tracking
3. Verify no security warnings appear

## Production Checklist
- ✅ Environment variables set
- ✅ Custom domain configured
- ✅ SSL certificate active
- ✅ Database migrated (if needed)
- ✅ Square credentials configured (for payments)