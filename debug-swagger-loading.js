const YAML = require('yamljs');
const path = require('path');

console.log('🔍 Debugging Swagger Documentation Loading\n');

// Load Swagger documentation files
const loadSwaggerDoc = (filename) => {
  try {
    const filePath = path.join(__dirname, 'swagger', filename);
    console.log(`📁 Loading: ${filePath}`);
    const doc = YAML.load(filePath);
    console.log(`✅ Loaded: ${filename}`);
    console.log(`   Title: ${doc?.info?.title || 'UNKNOWN'}`);
    console.log(`   Description: ${doc?.info?.description?.substring(0, 100) || 'UNKNOWN'}...`);
    console.log(`   Paths count: ${Object.keys(doc?.paths || {}).length}`);
    console.log('');
    return doc;
  } catch (error) {
    console.error(`❌ Error loading ${filename}:`, error.message);
    console.log('');
    return null;
  }
};

// Load all documentation files
console.log('📚 Loading all documentation files...\n');

const customerApiDoc = loadSwaggerDoc('customer-api.yaml');
const merchantApiDoc = loadSwaggerDoc('merchant-api.yaml');
const adminApiDoc = loadSwaggerDoc('admin-api.yaml');

// Check if documents are loaded correctly
console.log('📊 Summary:');
console.log(`Customer API Doc: ${customerApiDoc ? '✅ LOADED' : '❌ FAILED'}`);
console.log(`Merchant API Doc: ${merchantApiDoc ? '✅ LOADED' : '❌ FAILED'}`);
console.log(`Admin API Doc: ${adminApiDoc ? '✅ LOADED' : '❌ FAILED'}`);
console.log('');

// Check if they're different objects
console.log('🔍 Object Identity Check:');
console.log(`Customer === Merchant: ${customerApiDoc === merchantApiDoc}`);
console.log(`Customer === Admin: ${customerApiDoc === adminApiDoc}`);
console.log(`Merchant === Admin: ${merchantApiDoc === adminApiDoc}`);
console.log('');

// Check titles to verify content
if (customerApiDoc && merchantApiDoc && adminApiDoc) {
  console.log('📋 Content Verification:');
  console.log(`Customer Title: "${customerApiDoc.info.title}"`);
  console.log(`Merchant Title: "${merchantApiDoc.info.title}"`);
  console.log(`Admin Title: "${adminApiDoc.info.title}"`);
  console.log('');
  
  // Check if titles are correct
  const expectedTitles = {
    customer: 'Qmart Customer API',
    merchant: 'Qmart Merchant API',
    admin: 'Qmart Admin API'
  };
  
  console.log('✅ Title Verification:');
  console.log(`Customer: ${customerApiDoc.info.title === expectedTitles.customer ? '✅ CORRECT' : '❌ WRONG'}`);
  console.log(`Merchant: ${merchantApiDoc.info.title === expectedTitles.merchant ? '✅ CORRECT' : '❌ WRONG'}`);
  console.log(`Admin: ${adminApiDoc.info.title === expectedTitles.admin ? '✅ CORRECT' : '❌ WRONG'}`);
  console.log('');
  
  // Check first path to verify content
  console.log('🛣️  First Path Check:');
  const customerFirstPath = Object.keys(customerApiDoc.paths || {})[0];
  const merchantFirstPath = Object.keys(merchantApiDoc.paths || {})[0];
  const adminFirstPath = Object.keys(adminApiDoc.paths || {})[0];
  
  console.log(`Customer First Path: ${customerFirstPath}`);
  console.log(`Merchant First Path: ${merchantFirstPath}`);
  console.log(`Admin First Path: ${adminFirstPath}`);
  console.log('');
  
  // Check if paths are different (they should be)
  console.log('🔍 Path Uniqueness:');
  console.log(`Customer vs Merchant paths different: ${customerFirstPath !== merchantFirstPath ? '✅ YES' : '❌ NO'}`);
  console.log(`Customer vs Admin paths different: ${customerFirstPath !== adminFirstPath ? '✅ YES' : '❌ NO'}`);
  console.log(`Merchant vs Admin paths different: ${merchantFirstPath !== adminFirstPath ? '✅ YES' : '❌ NO'}`);
}

console.log('\n🎯 Conclusion:');
if (customerApiDoc && merchantApiDoc && adminApiDoc) {
  if (customerApiDoc.info.title === 'Qmart Customer API' &&
      merchantApiDoc.info.title === 'Qmart Merchant API' &&
      adminApiDoc.info.title === 'Qmart Admin API') {
    console.log('✅ All documentation files are loading correctly with proper content!');
    console.log('🔍 The issue might be in the route configuration or Swagger UI setup.');
  } else {
    console.log('❌ Documentation files have incorrect content!');
    console.log('🔧 The YAML files may have been corrupted or mixed up.');
  }
} else {
  console.log('❌ Some documentation files failed to load!');
  console.log('🔧 Check file paths and YAML syntax.');
}
