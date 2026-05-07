import path from 'path';
import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import pkg from 'square';
const { SquareClient, SquareEnvironment } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.resolve('./data/orders.db');

// Square Configuration (set these environment variables in production)
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || 'your-square-access-token';
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'
const SQUARE_APP_ID = process.env.SQUARE_APP_ID || 'your-square-app-id';

// Initialize Square client
const squareClient = new SquareClient({
  accessToken: SQUARE_ACCESS_TOKEN,
  environment: SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

// API Key for authentication (in production, use environment variables)
const API_KEY = process.env.API_KEY || 'oba-holdings-secure-api-key-2026';

// SSL certificates (only for local development)
let sslOptions;
if (process.env.NODE_ENV !== 'production') {
  sslOptions = {
    key: fs.readFileSync(path.resolve('./ssl/key.pem')),
    cert: fs.readFileSync(path.resolve('./ssl/cert.pem'))
  };
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://code.jquery.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for sensitive operations
  message: 'Too many sensitive requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://localhost:3000',
      'https://127.0.0.1:3000',
      // Add your production domain here
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all requests
app.use('/api/', limiter);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.prepare(`
  CREATE TABLE IF NOT EXISTS orders (
    trackingId TEXT PRIMARY KEY,
    customerName TEXT NOT NULL,
    serviceType TEXT NOT NULL,
    pickup TEXT NOT NULL,
    destination TEXT NOT NULL,
    contact TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trackingId TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(trackingId) REFERENCES orders(trackingId)
  )
`).run();

const insertOrder = db.prepare(`
  INSERT INTO orders (trackingId, customerName, serviceType, pickup, destination, contact, status, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertHistory = db.prepare(`
  INSERT INTO history (trackingId, status, timestamp)
  VALUES (?, ?, ?)
`);
const getOrder = db.prepare(`SELECT * FROM orders WHERE trackingId = ?`);
const getHistory = db.prepare(`SELECT status, timestamp FROM history WHERE trackingId = ? ORDER BY id ASC`);
const updateStatus = db.prepare(`UPDATE orders SET status = ? WHERE trackingId = ?`);

function generateTrackingId() {
  const prefix = 'OBA';
  const randomSegment = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timestampSegment = Date.now().toString().slice(-5);
  return `${prefix}${randomSegment}${timestampSegment}`;
}

// Authentication middleware
function authenticateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (apiKey !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}

// Input validation functions
function validateOrderInput(data) {
  const errors = [];

  if (!data.customerName || typeof data.customerName !== 'string' || data.customerName.trim().length < 2 || data.customerName.length > 100) {
    errors.push('Customer name must be 2-100 characters');
  }

  const validServices = ['Passenger Transport', 'Medical Courier', 'Meal Delivery', 'Express Courier', 'General Business'];
  if (!data.serviceType || !validServices.includes(data.serviceType)) {
    errors.push('Invalid service type');
  }

  if (!data.pickup || typeof data.pickup !== 'string' || data.pickup.trim().length < 5 || data.pickup.length > 200) {
    errors.push('Pickup location must be 5-200 characters');
  }

  if (!data.destination || typeof data.destination !== 'string' || data.destination.trim().length < 5 || data.destination.length > 200) {
    errors.push('Destination must be 5-200 characters');
  }

  if (!data.contact || typeof data.contact !== 'string' || data.contact.trim().length < 5 || data.contact.length > 100) {
    errors.push('Contact information must be 5-100 characters');
  }

  // Sanitize inputs
  if (data.customerName) data.customerName = data.customerName.trim().replace(/[<>\"'&]/g, '');
  if (data.pickup) data.pickup = data.pickup.trim().replace(/[<>\"'&]/g, '');
  if (data.destination) data.destination = data.destination.trim().replace(/[<>\"'&]/g, '');
  if (data.contact) data.contact = data.contact.trim().replace(/[<>\"'&]/g, '');

  return { isValid: errors.length === 0, errors };
}

function validateTrackingId(id) {
  if (!id || typeof id !== 'string') return false;
  const cleanId = id.toUpperCase().trim();
  return /^OBA[A-Z0-9]{10}$/.test(cleanId);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./website files for obaholdings.html'));
});

app.get('/api/orders/:id', authenticateAPIKey, (req, res) => {
  const trackingId = req.params.id.toUpperCase();

  if (!validateTrackingId(trackingId)) {
    return res.status(400).json({ error: 'Invalid tracking ID format' });
  }

  try {
    const order = getOrder.get(trackingId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const history = getHistory.all(trackingId);
    res.json({ ...order, history });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/orders', authenticateAPIKey, strictLimiter, (req, res) => {
  const validation = validateOrderInput(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors });
  }

  const { customerName, serviceType, pickup, destination, contact } = req.body;

  try {
    const trackingId = generateTrackingId();
    const createdAt = new Date().toISOString();
    const status = 'Created';

    insertOrder.run(trackingId, customerName, serviceType, pickup, destination, contact, status, createdAt);
    insertHistory.run(trackingId, status, createdAt);

    res.status(201).json({
      trackingId,
      customerName,
      serviceType,
      pickup,
      destination,
      contact,
      status,
      createdAt,
      history: [{ status, timestamp: createdAt }]
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.patch('/api/orders/:id/status', authenticateAPIKey, strictLimiter, (req, res) => {
  const trackingId = req.params.id.toUpperCase();
  const { status } = req.body;

  if (!validateTrackingId(trackingId)) {
    return res.status(400).json({ error: 'Invalid tracking ID format' });
  }

  if (!status || typeof status !== 'string' || status.trim().length < 2 || status.length > 50) {
    return res.status(400).json({ error: 'Invalid status: must be 2-50 characters' });
  }

  try {
    const order = getOrder.get(trackingId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    updateStatus.run(status, trackingId);
    const timestamp = new Date().toISOString();
    insertHistory.run(trackingId, status, timestamp);
    const history = getHistory.all(trackingId);

    res.json({ ...order, status, history });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Square Payment Endpoints
app.post('/api/payments/process', authenticateAPIKey, strictLimiter, async (req, res) => {
  const { sourceId, amount, currency = 'USD', orderId } = req.body;

  if (!sourceId || !amount || !orderId) {
    return res.status(400).json({ error: 'Missing required payment fields' });
  }

  if (amount < 1 || amount > 10000) {
    return res.status(400).json({ error: 'Amount must be between $1 and $10,000' });
  }

  try {
    const paymentsApi = squareClient.paymentsApi;

    const requestBody = {
      sourceId,
      amountMoney: {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
      },
      idempotencyKey: `${orderId}-${Date.now()}`,
      referenceId: orderId,
    };

    const { result } = await paymentsApi.createPayment(requestBody);

    // Store payment record in database
    const paymentRecord = {
      orderId,
      squarePaymentId: result.payment.id,
      amount: amount,
      currency,
      status: result.payment.status,
      createdAt: new Date().toISOString(),
    };

    // You might want to create a payments table for this
    console.log('Payment processed:', paymentRecord);

    res.json({
      success: true,
      paymentId: result.payment.id,
      status: result.payment.status,
      receiptUrl: result.payment.receiptUrl,
    });
  } catch (error) {
    console.error('Square payment error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Get Square configuration for frontend
app.get('/api/square/config', authenticateAPIKey, (req, res) => {
  res.json({
    appId: SQUARE_APP_ID,
    environment: SQUARE_ENVIRONMENT,
  });
});

// Start server
if (process.env.NODE_ENV === 'production') {
  // Production: HTTP (Heroku handles SSL termination)
  app.listen(PORT, () => {
    console.log(`OBA Holdings backend running on port ${PORT}`);
  });
} else {
  // Development: HTTPS with self-signed certificates
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`OBA Holdings backend running on https://localhost:${PORT}`);
  });
}
