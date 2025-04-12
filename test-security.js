/**
 * Security Testing Script for Monday.com AI Workflow Assistant
 * 
 * This script tests the TLS and HSTS configuration of the server.
 * It verifies that:
 * 1. The server is using TLS 1.2 or higher
 * 2. HSTS is properly configured with a minimum age of one year
 * 3. All endpoints redirect from HTTP to HTTPS
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3000;
const HTTP_PORT = process.env.HTTP_PORT || 3001;

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test results
const results = {
  tlsVersion: {
    pass: false,
    value: null,
    requirement: 'TLS 1.2 or higher',
  },
  hstsHeader: {
    pass: false,
    value: null,
    requirement: 'max-age=31536000; includeSubDomains; preload',
  },
  httpToHttpsRedirect: {
    pass: false,
    value: null,
    requirement: 'HTTP should redirect to HTTPS',
  },
};

/**
 * Test TLS version and HSTS header
 */
function testTlsAndHsts() {
  console.log(`${colors.blue}Testing TLS version and HSTS header...${colors.reset}`);
  
  const options = {
    hostname: SERVER_HOST,
    port: HTTPS_PORT,
    path: '/',
    method: 'GET',
    rejectUnauthorized: false, // Allow self-signed certificates for testing
  };
  
  const req = https.request(options, (res) => {
    // Check TLS version
    const tlsVersion = res.socket.getProtocol();
    results.tlsVersion.value = tlsVersion;
    
    if (tlsVersion === 'TLSv1.2' || tlsVersion === 'TLSv1.3') {
      results.tlsVersion.pass = true;
      console.log(`${colors.green}✓ TLS Version: ${tlsVersion}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ TLS Version: ${tlsVersion} (should be TLSv1.2 or higher)${colors.reset}`);
    }
    
    // Check HSTS header
    const hstsHeader = res.headers['strict-transport-security'];
    results.hstsHeader.value = hstsHeader;
    
    if (hstsHeader) {
      // Check if max-age is at least one year (31536000 seconds)
      const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;
      
      if (maxAge >= 31536000 && 
          hstsHeader.includes('includeSubDomains') && 
          hstsHeader.includes('preload')) {
        results.hstsHeader.pass = true;
        console.log(`${colors.green}✓ HSTS Header: ${hstsHeader}${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ HSTS Header: ${hstsHeader}${colors.reset}`);
        console.log(`${colors.red}  HSTS should have max-age >= 31536000, includeSubDomains, and preload${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ HSTS Header: Not present${colors.reset}`);
    }
    
    // Continue with HTTP to HTTPS redirect test
    testHttpToHttpsRedirect();
  });
  
  req.on('error', (e) => {
    console.error(`${colors.red}Error testing HTTPS: ${e.message}${colors.reset}`);
    console.log(`${colors.yellow}Make sure the server is running with HTTPS enabled.${colors.reset}`);
    
    // Continue with HTTP to HTTPS redirect test
    testHttpToHttpsRedirect();
  });
  
  req.end();
}

/**
 * Test HTTP to HTTPS redirect
 */
function testHttpToHttpsRedirect() {
  console.log(`\n${colors.blue}Testing HTTP to HTTPS redirect...${colors.reset}`);
  
  const options = {
    hostname: SERVER_HOST,
    port: HTTP_PORT,
    path: '/',
    method: 'GET',
    headers: {
      'Host': SERVER_HOST,
    },
  };
  
  const req = http.request(options, (res) => {
    // Check if we got a redirect (status code 301 or 302)
    if (res.statusCode === 301 || res.statusCode === 302) {
      const location = res.headers.location;
      results.httpToHttpsRedirect.value = location;
      
      if (location && location.startsWith('https://')) {
        results.httpToHttpsRedirect.pass = true;
        console.log(`${colors.green}✓ HTTP redirects to HTTPS: ${location}${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Redirect does not use HTTPS: ${location}${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ No redirect from HTTP to HTTPS (status code: ${res.statusCode})${colors.reset}`);
    }
    
    // Print summary
    printSummary();
  });
  
  req.on('error', (e) => {
    console.error(`${colors.red}Error testing HTTP: ${e.message}${colors.reset}`);
    console.log(`${colors.yellow}Make sure the server is running and accessible via HTTP.${colors.reset}`);
    
    // Print summary
    printSummary();
  });
  
  req.end();
}

/**
 * Print summary of test results
 */
function printSummary() {
  console.log(`\n${colors.magenta}=== Security Test Summary ===${colors.reset}`);
  
  // TLS Version
  if (results.tlsVersion.pass) {
    console.log(`${colors.green}✓ TLS Version: ${results.tlsVersion.value}${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ TLS Version: ${results.tlsVersion.value || 'Not tested'}${colors.reset}`);
    console.log(`  Required: ${results.tlsVersion.requirement}`);
  }
  
  // HSTS Header
  if (results.hstsHeader.pass) {
    console.log(`${colors.green}✓ HSTS Header: Properly configured${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ HSTS Header: ${results.hstsHeader.value || 'Not present'}${colors.reset}`);
    console.log(`  Required: ${results.hstsHeader.requirement}`);
  }
  
  // HTTP to HTTPS Redirect
  if (results.httpToHttpsRedirect.pass) {
    console.log(`${colors.green}✓ HTTP to HTTPS Redirect: Working${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ HTTP to HTTPS Redirect: Not working${colors.reset}`);
    console.log(`  Required: ${results.httpToHttpsRedirect.requirement}`);
  }
  
  // Overall result
  const allPassed = results.tlsVersion.pass && results.hstsHeader.pass && results.httpToHttpsRedirect.pass;
  
  console.log(`\n${allPassed ? colors.green : colors.red}Overall Result: ${allPassed ? 'PASS' : 'FAIL'}${colors.reset}`);
  
  if (!allPassed) {
    console.log(`\n${colors.yellow}Recommendations:${colors.reset}`);
    
    if (!results.tlsVersion.pass) {
      console.log(`- Configure your server to use TLS 1.2 or higher`);
    }
    
    if (!results.hstsHeader.pass) {
      console.log(`- Set HSTS header with max-age=31536000, includeSubDomains, and preload`);
    }
    
    if (!results.httpToHttpsRedirect.pass) {
      console.log(`- Implement HTTP to HTTPS redirect in your server`);
    }
  }
}

// Start the tests
testTlsAndHsts();