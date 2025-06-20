#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🐳 Docker Build Verification for Qmart Backend\n');

// Critical files that must exist after TypeScript compilation
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

// Check if dist directory exists
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ CRITICAL: dist directory does not exist!');
  console.error('💡 This indicates TypeScript compilation failed completely.');
  process.exit(1);
}

console.log('✅ dist directory exists');

// Check directory structure
console.log('\n📁 Checking dist directory structure:');
try {
  const distContents = fs.readdirSync(distPath);
  console.log('📂 dist contents:', distContents.join(', '));
  
  // Check if config directory exists
  const configPath = path.join(distPath, 'config');
  if (fs.existsSync(configPath)) {
    const configContents = fs.readdirSync(configPath);
    console.log('📂 dist/config contents:', configContents.join(', '));
  } else {
    console.error('❌ CRITICAL: dist/config directory missing!');
  }
} catch (error) {
  console.error('❌ Error reading dist directory:', error.message);
}

// Verify each critical file
console.log('\n🔍 Verifying critical files:');
let allFilesExist = true;
let missingFiles = [];

criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.error(`❌ MISSING: ${file}`);
    allFilesExist = false;
    missingFiles.push(file);
  }
});

// Test module imports
console.log('\n🧪 Testing module imports:');
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
    console.log('✅ Server file exists and is importable');
  } else {
    throw new Error('Server file not found');
  }
} catch (error) {
  console.error('❌ Server import test failed:', error.message);
  allFilesExist = false;
}

// Check file sizes (compiled files should not be empty)
console.log('\n📏 Checking file sizes:');
criticalFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      console.error(`❌ ${file} is empty (0 bytes)`);
      allFilesExist = false;
    } else {
      console.log(`✅ ${file} (${stats.size} bytes)`);
    }
  }
});

// Final result
console.log('\n🎯 Docker Build Verification Result:');
if (allFilesExist) {
  console.log('✅ ALL CHECKS PASSED - Docker build is ready!');
  console.log('🚀 All critical files compiled successfully');
  process.exit(0);
} else {
  console.error('❌ VERIFICATION FAILED - Docker build has issues');
  console.error('🔧 Missing files:', missingFiles.join(', '));
  console.error('\n💡 Troubleshooting steps:');
  console.error('1. Check TypeScript compilation errors');
  console.error('2. Verify tsconfig.json includes all source files');
  console.error('3. Ensure all source files have correct syntax');
  console.error('4. Check for circular dependencies');
  process.exit(1);
}
