const YAML = require('yamljs');
const path = require('path');
const http = require('http');

console.log('🔍 COMPREHENSIVE SWAGGER ROUTING DIAGNOSIS\n');

// Step 1: Verify YAML file loading
console.log('📚 Step 1: Verifying YAML file loading...');

const loadSwaggerDoc = (filename) => {
  try {
    const filePath = path.join(__dirname, 'swagger', filename);
    const doc = YAML.load(filePath);
    return doc;
  } catch (error) {
    console.error(`❌ Error loading ${filename}:`, error.message);
    return null;
  }
};

const customerApiDoc = loadSwaggerDoc('customer-api.yaml');
const merchantApiDoc = loadSwaggerDoc('merchant-api.yaml');
const adminApiDoc = loadSwaggerDoc('admin-api.yaml');

console.log(`Customer Doc: ${customerApiDoc ? '✅ LOADED' : '❌ FAILED'} - Title: "${customerApiDoc?.info?.title}"`);
console.log(`Merchant Doc: ${merchantApiDoc ? '✅ LOADED' : '❌ FAILED'} - Title: "${merchantApiDoc?.info?.title}"`);
console.log(`Admin Doc: ${adminApiDoc ? '✅ LOADED' : '❌ FAILED'} - Title: "${adminApiDoc?.info?.title}"`);

// Step 2: Check object identity
console.log('\n🔍 Step 2: Checking object identity...');
console.log(`Customer === Merchant: ${customerApiDoc === merchantApiDoc}`);
console.log(`Customer === Admin: ${customerApiDoc === adminApiDoc}`);
console.log(`Merchant === Admin: ${merchantApiDoc === adminApiDoc}`);

// Step 3: Check first paths to verify content uniqueness
console.log('\n🛣️  Step 3: Checking first paths...');
const customerFirstPath = Object.keys(customerApiDoc?.paths || {})[0];
const merchantFirstPath = Object.keys(merchantApiDoc?.paths || {})[0];
const adminFirstPath = Object.keys(adminApiDoc?.paths || {})[0];

console.log(`Customer First Path: ${customerFirstPath}`);
console.log(`Merchant First Path: ${merchantFirstPath}`);
console.log(`Admin First Path: ${adminFirstPath}`);

// Step 4: Test actual HTTP responses
console.log('\n🌐 Step 4: Testing HTTP responses...');

async function testHttpResponse(url, expectedTitle) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Extract title from HTML
        const titleMatch = data.match(/<title>(.*?)<\/title>/);
        const actualTitle = titleMatch ? titleMatch[1] : 'No title found';
        
        // Check for API-specific content in the HTML
        const hasCustomerContent = data.includes('/api/auth/customer/signup') || data.includes('Customer Authentication');
        const hasMerchantContent = data.includes('/api/auth/merchant/signup') || data.includes('Merchant Authentication');
        const hasAdminContent = data.includes('/api/admin/signin') || data.includes('Admin Authentication');
        
        // Look for the actual API spec in the HTML (Swagger UI embeds it)
        const specMatch = data.match(/spec:\s*({.*?}),?\s*dom_id/s);
        let specTitle = 'Not found';
        if (specMatch) {
          try {
            const spec = JSON.parse(specMatch[1]);
            specTitle = spec.info?.title || 'No title in spec';
          } catch (e) {
            specTitle = 'Failed to parse spec';
          }
        }
        
        resolve({
          url,
          status: res.statusCode,
          expectedTitle,
          actualTitle,
          specTitle,
          hasCustomerContent,
          hasMerchantContent,
          hasAdminContent,
          contentLength: data.length
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: 'ERROR',
        error: err.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT'
      });
    });
  });
}

async function runHttpTests() {
  const tests = [
    { url: 'http://localhost:5000/api/docs/customers/', expected: 'Qmart Customer API Documentation' },
    { url: 'http://localhost:5000/api/docs/merchants/', expected: 'Qmart Merchant API Documentation' },
    { url: 'http://localhost:5000/api/docs/admin/', expected: 'Qmart Admin API Documentation' }
  ];
  
  for (const test of tests) {
    console.log(`\nTesting: ${test.url}`);
    const result = await testHttpResponse(test.url, test.expected);
    
    if (result.error) {
      console.log(`❌ ERROR: ${result.error}`);
    } else {
      console.log(`📊 Status: ${result.status}`);
      console.log(`📄 Page Title: "${result.actualTitle}"`);
      console.log(`📋 Spec Title: "${result.specTitle}"`);
      console.log(`🎯 Expected: "${result.expectedTitle}"`);
      console.log(`✅ Title Match: ${result.actualTitle === result.expectedTitle ? 'YES' : 'NO'}`);
      console.log(`📊 Content Analysis:`);
      console.log(`   Customer Content: ${result.hasCustomerContent ? '✅' : '❌'}`);
      console.log(`   Merchant Content: ${result.hasMerchantContent ? '✅' : '❌'}`);
      console.log(`   Admin Content: ${result.hasAdminContent ? '✅' : '❌'}`);
      console.log(`📏 Content Length: ${result.contentLength} bytes`);
      
      // Determine what content is actually being served
      let actualContent = 'Unknown';
      if (result.hasCustomerContent && !result.hasMerchantContent && !result.hasAdminContent) {
        actualContent = 'Customer API';
      } else if (result.hasMerchantContent && !result.hasCustomerContent && !result.hasAdminContent) {
        actualContent = 'Merchant API';
      } else if (result.hasAdminContent && !result.hasCustomerContent && !result.hasMerchantContent) {
        actualContent = 'Admin API';
      } else if (result.hasCustomerContent || result.hasMerchantContent || result.hasAdminContent) {
        actualContent = 'Mixed Content';
      }
      
      console.log(`🔍 Actual Content: ${actualContent}`);
      
      const isCorrect = (
        (test.url.includes('customers') && actualContent === 'Customer API') ||
        (test.url.includes('merchants') && actualContent === 'Merchant API') ||
        (test.url.includes('admin') && actualContent === 'Admin API')
      );
      
      console.log(`✅ Serving Correct Content: ${isCorrect ? 'YES' : 'NO'}`);
    }
  }
}

// Run all tests
runHttpTests().then(() => {
  console.log('\n🎯 DIAGNOSIS COMPLETE');
  console.log('If the issue persists, the problem is likely in the Express routing configuration.');
}).catch(console.error);
