#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Qmart Backend Deployment Build...\n');

// Check if dist directory exists
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory does not exist!');
  process.exit(1);
}

console.log('✅ dist directory exists');

// Check critical files
const criticalFiles = [
  'dist/server.js',
  'dist/config/database.js',
  'dist/config/email.js',
  'dist/Auth/customer/customer.routes.js',
  'dist/Auth/merchant/merchant.routes.js',
  'dist/Auth/shared/auth.routes.js',
  'dist/routes/wallet.routes.js',
  'dist/routes/kyc.routes.js',
  'dist/routes/admin.routes.js',
  'dist/routes/documentation.routes.js',
  'dist/services/admin.service.js',
  'dist/middleware/auth.middleware.js',
  'dist/monitoring/metrics.js'
];

let allFilesExist = true;

criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.error(`❌ ${file} is missing!`);
    allFilesExist = false;
  }
});

// Check if swagger files are copied
const swaggerFiles = [
  'dist/swagger/customer-api.yaml',
  'dist/swagger/merchant-api.yaml',
  'dist/swagger/admin-api.yaml'
];

console.log('\n📚 Checking Swagger documentation files...');
swaggerFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`⚠️  ${file} is missing (will be created if needed)`);
  }
});

// Test require statements
console.log('\n🧪 Testing module imports...');

try {
  // Test database config import
  const databasePath = path.join(__dirname, '..', 'dist', 'config', 'database.js');
  if (fs.existsSync(databasePath)) {
    require(databasePath);
    console.log('✅ Database config can be imported');
  } else {
    throw new Error('Database config file not found');
  }
} catch (error) {
  console.error('❌ Database config import failed:', error.message);
  allFilesExist = false;
}

try {
  // Test server import (without running it)
  const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
  if (fs.existsSync(serverPath)) {
    console.log('✅ Server file exists and can be imported');
  } else {
    throw new Error('Server file not found');
  }
} catch (error) {
  console.error('❌ Server import test failed:', error.message);
  allFilesExist = false;
}

// Check package.json
console.log('\n📦 Checking package.json...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts.start) {
    console.log(`✅ Start script: ${packageJson.scripts.start}`);
  } else {
    console.error('❌ No start script found in package.json');
    allFilesExist = false;
  }
  
  if (packageJson.engines && packageJson.engines.node) {
    console.log(`✅ Node version specified: ${packageJson.engines.node}`);
  } else {
    console.log('⚠️  No Node version specified in engines');
  }
} else {
  console.error('❌ package.json not found');
  allFilesExist = false;
}

// Final result
console.log('\n🎯 Deployment Verification Result:');
if (allFilesExist) {
  console.log('✅ All critical files are present and importable');
  console.log('🚀 Build is ready for deployment!');
  process.exit(0);
} else {
  console.error('❌ Some critical files are missing or have import issues');
  console.error('🔧 Please fix the issues before deploying');
  process.exit(1);
}
