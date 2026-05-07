# OBA Holdings Website with Tracking Backend

This workspace now includes a secure Express backend with comprehensive security measures to protect against scammers and hackers.

## Security Features

### 🔐 Authentication & Authorization
- **API Key Authentication**: All API endpoints require a valid API key
- **Bearer Token Support**: Alternative authentication via Authorization header
- **Environment Variable Support**: API keys stored securely (not hardcoded in production)

### 🛡️ Input Validation & Sanitization
- **Comprehensive Input Validation**: All user inputs validated for type, length, and format
- **XSS Protection**: HTML characters sanitized from all inputs
- **SQL Injection Prevention**: Parameterized queries prevent SQL injection
- **Tracking ID Validation**: Strict regex validation for tracking IDs

### 🚦 Rate Limiting
- **General Rate Limiting**: 100 requests per 15 minutes per IP
- **Strict Rate Limiting**: 10 requests per 15 minutes for sensitive operations (order creation/updates)
- **Automatic Blocking**: IPs exceeding limits are temporarily blocked

### 🔒 HTTPS & Security Headers
- **SSL/TLS Encryption**: All traffic encrypted with HTTPS
- **Security Headers**: Helmet.js provides comprehensive security headers
- **Content Security Policy**: Prevents XSS and data injection attacks
- **CORS Protection**: Configured to only allow trusted origins

### 📊 Error Handling & Logging
- **Secure Error Messages**: No sensitive information leaked in errors
- **Request Logging**: Security events and errors logged for monitoring
- **Database Error Protection**: Graceful handling of database failures

### 🗄️ Database Security
- **SQLite with WAL Mode**: Optimized for concurrent access
- **Parameterized Queries**: Prevents SQL injection attacks
- **Input Sanitization**: All database inputs cleaned before storage

## Square Payment Integration

### 💳 Payment Processing
- **Square Web Payments SDK**: Secure client-side payment processing
- **Sandbox Environment**: Test payments without real money
- **Production Ready**: Easy switch to live payments
- **Payment Verification**: Server-side payment validation
- **Order Tracking**: Payments linked to order tracking system

### 🔧 Square Setup
1. Create a Square Developer account at https://developer.squareup.com
2. Create an application and get your Application ID and Access Token
3. Set environment variables:
   ```bash
   export SQUARE_ACCESS_TOKEN="your-access-token"
   export SQUARE_APP_ID="your-app-id"
   export SQUARE_ENVIRONMENT="sandbox"  # or "production"
   ```
4. For production, replace self-signed SSL certificates with CA-signed ones

## Files
- `website files for obaholdings.html` — secure front-end with Square payment integration
- `server.js` — hardened backend with comprehensive security and Square payments
- `data/orders.db` — secure SQLite database
- `ssl/` — SSL certificates for HTTPS encryption
- `package.json` — dependencies including security packages and Square SDK

## Run locally
1. Install Node.js and npm if not already installed.
2. In `/Users/oba/Documents`, run:
   ```bash
   npm install
   npm start
   ```
3. Open the site in your browser at:
   ```
   https://localhost:3000/
   ```

   **Note:** Your browser will show a security warning for the self-signed certificate. Click "Advanced" and "Proceed to localhost (unsafe)" to continue.

## Square Payment Integration

The website includes secure Square payment processing for accepting credit cards and digital wallets.

### Setup Square Account

1. **Create Square Account**: Visit [squareup.com](https://squareup.com) and create a business account
2. **Get API Credentials**:
   - Go to [Square Developer Dashboard](https://developer.squareup.com)
   - Create a new application
   - Get your **Application ID** and **Access Token**

### Environment Variables

Set these environment variables for Square integration:

```bash
# Square Configuration
SQUARE_ACCESS_TOKEN=your-square-access-token-here
SQUARE_APP_ID=your-square-application-id-here
SQUARE_ENVIRONMENT=sandbox  # or 'production'

# Security
API_KEY=your-secure-api-key-here
```

### Testing Payments

- Use `sandbox` environment for testing
- Use test card numbers from [Square Testing](https://developer.squareup.com/docs/devtools/sandbox/payments)
- Switch to `production` when ready for live payments

## SSL Certificates

### Development (Current Setup)
- Uses self-signed certificates in `ssl/` directory
- Browser shows security warning (normal for development)

### Production Setup
Replace self-signed certificates with CA-signed certificates:

```bash
# Place your production certificates in ssl/ directory
ssl/cert.pem    # Your domain certificate from CA
ssl/key.pem     # Your private key (keep secure!)

# Update server.js environment to production
NODE_ENV=production
SQUARE_ENVIRONMENT=production
```

## API Endpoints

All API endpoints require authentication via `X-API-Key` header or `Authorization: Bearer <key>` header.

### Create Order
```http
POST /api/orders
X-API-Key: your-api-key
Content-Type: application/json

{
  "customerName": "John Doe",
  "serviceType": "Medical Courier",
  "pickup": "123 Main St, City, State",
  "destination": "456 Hospital Ave, City, State",
  "contact": "john@example.com"
}
```

### Get Order Status
```http
GET /api/orders/OBA123ABC45
X-API-Key: your-api-key
```

### Update Order Status (Admin Only)
```http
PATCH /api/orders/OBA123ABC45/status
X-API-Key: your-api-key
Content-Type: application/json

{
  "status": "In Transit"
}
```

## Production Deployment

### Environment Variables
Set these environment variables in production:
```bash
API_KEY=your-secure-api-key-here
NODE_ENV=production
PORT=443
```

### SSL Certificates
Replace self-signed certificates with CA-signed certificates:
```bash
# Place your certificates in ssl/ directory
ssl/cert.pem  # Your domain certificate
ssl/key.pem   # Your private key
```

### Security Checklist
- [ ] Change default API key
- [ ] Use CA-signed SSL certificates
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting thresholds
- [ ] Set up HTTPS redirect
