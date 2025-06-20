#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running post-build tasks for Qmart Backend...\n');

// Ensure dist directory exists
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory does not exist after build!');
  process.exit(1);
}

console.log('✅ dist directory exists');

// Copy swagger files to dist
const swaggerSrcPath = path.join(__dirname, '..', 'swagger');
const swaggerDistPath = path.join(distPath, 'swagger');

if (fs.existsSync(swaggerSrcPath)) {
  if (!fs.existsSync(swaggerDistPath)) {
    fs.mkdirSync(swaggerDistPath, { recursive: true });
  }
  
  const swaggerFiles = fs.readdirSync(swaggerSrcPath);
  swaggerFiles.forEach(file => {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const srcFile = path.join(swaggerSrcPath, file);
      const destFile = path.join(swaggerDistPath, file);
      fs.copyFileSync(srcFile, destFile);
      console.log(`✅ Copied ${file} to dist/swagger/`);
    }
  });
}

// Verify critical files exist
const criticalFiles = [
  'dist/server.js',
  'dist/config/database.js'
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

// Create a simple health check for the build
if (allFilesExist) {
  console.log('\n🎉 Post-build tasks completed successfully!');
  console.log('🚀 Build is ready for deployment on Render!');
} else {
  console.error('\n❌ Post-build verification failed!');
  process.exit(1);
}
