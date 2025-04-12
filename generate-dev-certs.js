/**
 * Generate Self-Signed Certificates for Development
 * 
 * This script generates self-signed SSL/TLS certificates for development purposes.
 * DO NOT USE THESE CERTIFICATES IN PRODUCTION!
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

// Certificate paths
const keyPath = path.join(certsDir, 'privkey.pem');
const certPath = path.join(certsDir, 'cert.pem');
const csrPath = path.join(certsDir, 'csr.pem');

console.log('Generating self-signed certificates for development...');
console.log('NOTE: These certificates should NOT be used in production!');

try {
  // Generate private key
  console.log('\nGenerating private key...');
  execSync(`openssl genrsa -out "${keyPath}" 2048`);
  console.log('✅ Private key generated successfully.');

  // Generate CSR (Certificate Signing Request)
  console.log('\nGenerating CSR...');
  execSync(`openssl req -new -key "${keyPath}" -out "${csrPath}" -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`);
  console.log('✅ CSR generated successfully.');

  // Generate self-signed certificate
  console.log('\nGenerating self-signed certificate...');
  execSync(`openssl x509 -req -days 365 -in "${csrPath}" -signkey "${keyPath}" -out "${certPath}"`);
  console.log('✅ Self-signed certificate generated successfully.');

  // Update .env file with certificate paths
  console.log('\nUpdating .env file with certificate paths...');
  
  let envContent = '';
  if (fs.existsSync('.env')) {
    envContent = fs.readFileSync('.env', 'utf8');
  }

  // Update or add TLS certificate paths
  if (envContent.includes('TLS_KEY_PATH=')) {
    envContent = envContent.replace(/TLS_KEY_PATH=.*/, `TLS_KEY_PATH=${keyPath}`);
  } else {
    envContent += `\nTLS_KEY_PATH=${keyPath}`;
  }

  if (envContent.includes('TLS_CERT_PATH=')) {
    envContent = envContent.replace(/TLS_CERT_PATH=.*/, `TLS_CERT_PATH=${certPath}`);
  } else {
    envContent += `\nTLS_CERT_PATH=${certPath}`;
  }

  // No CA for self-signed certs, but we'll set it to the cert path for simplicity
  if (envContent.includes('TLS_CA_PATH=')) {
    envContent = envContent.replace(/TLS_CA_PATH=.*/, `TLS_CA_PATH=${certPath}`);
  } else {
    envContent += `\nTLS_CA_PATH=${certPath}`;
  }

  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file updated with certificate paths.');

  // Print certificate info
  console.log('\nCertificate information:');
  const certInfo = execSync(`openssl x509 -in "${certPath}" -text -noout | grep -E "Issuer:|Subject:|Not Before:|Not After :"`).toString();
  console.log(certInfo);

  console.log('\n✅ Self-signed certificates generated successfully!');
  console.log(`\nCertificate files:
- Private Key: ${keyPath}
- Certificate: ${certPath}
- CSR: ${csrPath}`);

  console.log('\n⚠️  IMPORTANT: These certificates are for development only!');
  console.log('When running the server, you may need to accept security warnings in your browser.');

} catch (error) {
  console.error('\n❌ Error generating certificates:', error.message);
  console.error('Make sure OpenSSL is installed on your system.');
  process.exit(1);
}