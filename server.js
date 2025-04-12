const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Set strict transport security header with 1 year duration (31536000 seconds) as required by monday.com
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));

// Force HTTPS
app.use((req, res, next) => {
  if (req.secure) {
    // Request is already secure
    next();
  } else {
    // Redirect to HTTPS
    res.redirect('https://' + req.headers.host + req.url);
  }
});

// CORS configuration
app.use(cors({
  origin: ['https://auth.monday.com', 'https://api.monday.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request body
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// OAuth callback endpoint
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }
  
  try {
    // Exchange code for token (implementation would go here)
    // This is a placeholder for the actual OAuth token exchange
    
    // Redirect to the app with token
    res.redirect('/');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
});

// API token validation middleware
const validateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  
  // Token validation logic would go here
  // This is a placeholder for actual token validation
  
  next();
};

// Protected API routes
app.use('/api/protected', validateToken, (req, res) => {
  // Protected routes logic
});

// The "catchall" handler: for any request that doesn't match one above, send back the index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Check if we're in development or production
if (process.env.NODE_ENV === 'production') {
  // In production, use HTTPS with proper certificates
  try {
    const privateKey = fs.readFileSync(process.env.TLS_KEY_PATH || '/path/to/privkey.pem', 'utf8');
    const certificate = fs.readFileSync(process.env.TLS_CERT_PATH || '/path/to/cert.pem', 'utf8');
    const ca = fs.readFileSync(process.env.TLS_CA_PATH || '/path/to/chain.pem', 'utf8');
    
    const credentials = {
      key: privateKey,
      cert: certificate,
      ca: ca,
      // Enforce minimum TLS version 1.2 as required by monday.com
      minVersion: 'TLSv1.2'
    };
    
    // Create HTTPS server
    const httpsServer = https.createServer(credentials, app);
    
    httpsServer.listen(PORT, () => {
      console.log(`HTTPS Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start HTTPS server:', error);
    // Fallback to HTTP in case of certificate issues (not recommended for production)
    app.listen(PORT, () => {
      console.log(`HTTP Server running on port ${PORT} (INSECURE - certificate issue)`);
    });
  }
} else {
  // In development, we can use HTTP
  app.listen(PORT, () => {
    console.log(`Development server running on port ${PORT}`);
    console.log('Note: HTTPS is not enabled in development mode');
  });
}