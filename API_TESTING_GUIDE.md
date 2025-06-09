# í·ª Qmart API Testing Guide

## í³‹ Complete Testing Workflows

### í´§ Environment Setup
```bash
# 1. Start the server
npm run dev

# 2. Set environment variables
export API_BASE_URL="http://localhost:5000"
export CUSTOMER_EMAIL="customer@test.com"
export MERCHANT_EMAIL="merchant@test.com"
export TEST_PASSWORD="password123"
```

## í±¤ Customer Journey Testing

### Step 1: Customer Signup
```bash
curl -X POST $API_BASE_URL/api/auth/customer/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$CUSTOMER_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Customer account created successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "customer@test.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    },
    "wallet": {
      "accountNumber": "123456789",
      "balance": 0.00
    }
  }
}
```

### Step 2: Verify Customer Email
```bash
# Note: Check your email for the OTP code
curl -X POST $API_BASE_URL/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$CUSTOMER_EMAIL'",
    "otp": "123456"
  }'
```

### Step 3: Customer Sign In
```bash
curl -X POST $API_BASE_URL/api/auth/customer/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$CUSTOMER_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }'
```

**Save the JWT token from response for authenticated requests**

## í¿ª Merchant Journey Testing

### Step 1: Merchant Signup
```bash
curl -X POST $API_BASE_URL/api/auth/merchant/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$MERCHANT_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1234567891"
  }'
```

### Step 2: Verify Merchant Email
```bash
curl -X POST $API_BASE_URL/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$MERCHANT_EMAIL'",
    "otp": "123456"
  }'
```

### Step 3: Merchant Sign In (to get JWT token)
```bash
MERCHANT_TOKEN=$(curl -s -X POST $API_BASE_URL/api/auth/merchant/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$MERCHANT_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }' | jq -r '.data.token')

echo "Merchant Token: $MERCHANT_TOKEN"
```

### Step 4: Complete Business Information
```bash
curl -X POST $API_BASE_URL/api/auth/merchant/business-info \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MERCHANT_TOKEN" \
  -d '{
    "userId": "507f1f77bcf86cd799439012",
    "businessName": "Jane'\''s Store",
    "businessType": "retail",
    "businessAddress": {
      "street": "123 Main Street",
      "city": "Lagos",
      "state": "Lagos",
      "zipCode": "100001",
      "country": "Nigeria"
    },
    "businessPhone": "+1234567891",
    "businessEmail": "business@test.com",
    "taxId": "TAX123456",
    "businessLicense": "LIC789012"
  }'
```

## í´ Password Reset Testing

### Step 1: Request Password Reset
```bash
curl -X POST $API_BASE_URL/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$CUSTOMER_EMAIL'"
  }'
```

### Step 2: Reset Password with OTP
```bash
curl -X POST $API_BASE_URL/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$CUSTOMER_EMAIL'",
    "otp": "123456",
    "newPassword": "newpassword123"
  }'
```

## íº¦ Rate Limiting Testing

### Test General Rate Limit (100 requests/15min)
```bash
for i in {1..105}; do
  echo "Request $i"
  curl -s $API_BASE_URL/health > /dev/null
  if [ $i -eq 101 ]; then
    echo "Should start getting rate limited..."
  fi
done
```

### Test Auth Rate Limit (5 requests/15min)
```bash
for i in {1..7}; do
  echo "Auth Request $i"
  curl -X POST $API_BASE_URL/api/auth/customer/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@email.com","password":"wrong"}'
  if [ $i -eq 6 ]; then
    echo "Should be rate limited..."
  fi
done
```

## í·ª Error Scenario Testing

### Test Invalid Email Format
```bash
curl -X POST $API_BASE_URL/api/auth/customer/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

### Test Duplicate User Registration
```bash
# Try to register the same customer twice
curl -X POST $API_BASE_URL/api/auth/customer/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$CUSTOMER_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

### Test Invalid OTP
```bash
curl -X POST $API_BASE_URL/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$CUSTOMER_EMAIL'",
    "otp": "000000"
  }'
```

### Test Unverified Account Login
```bash
# Try to login before email verification
curl -X POST $API_BASE_URL/api/auth/customer/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@test.com",
    "password": "'$TEST_PASSWORD'"
  }'
```

## í³Š Postman Collection

### Import to Postman
1. Create new collection "Qmart API"
2. Add environment variables:
   - `base_url`: http://localhost:5000
   - `customer_email`: customer@test.com
   - `merchant_email`: merchant@test.com
   - `password`: password123
   - `customer_token`: (will be set after login)
   - `merchant_token`: (will be set after login)

### Collection Structure
```
Qmart API/
â”œâ”€â”€ Health & Info/
â”‚   â”œâ”€â”€ GET Health Check
â”‚   â””â”€â”€ GET API Info
â”œâ”€â”€ Customer Auth/
â”‚   â”œâ”€â”€ POST Customer Signup
â”‚   â”œâ”€â”€ POST Customer Signin
â”‚   â””â”€â”€ POST Customer Signout
â”œâ”€â”€ Merchant Auth/
â”‚   â”œâ”€â”€ POST Merchant Signup
â”‚   â”œâ”€â”€ POST Merchant Signin
â”‚   â”œâ”€â”€ POST Business Info (Protected)
â”‚   â””â”€â”€ POST Merchant Signout
â””â”€â”€ Shared Auth/
    â”œâ”€â”€ POST Verify OTP
    â”œâ”€â”€ POST Forgot Password
    â””â”€â”€ POST Reset Password
```

## í´ Response Validation

### Success Response Format
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data varies by endpoint
  }
}
```

### Error Response Format
```json
{
  "status": "error",
  "message": "Error description"
}
```

### Rate Limit Response
```json
{
  "status": "error",
  "message": "Too many requests from this IP, please try again later."
}
```

## í¾¯ Testing Checklist

### âœ… Customer Flow
- [ ] Customer signup creates user and wallet
- [ ] Email OTP is sent and can be verified
- [ ] Customer can sign in after verification
- [ ] JWT token is returned and cookies are set
- [ ] Customer cannot sign in before verification

### âœ… Merchant Flow
- [ ] Merchant signup creates user (no wallet yet)
- [ ] Email OTP is sent and can be verified
- [ ] Merchant can add business information after verification
- [ ] Business info creation generates wallet
- [ ] Merchant can sign in after completing profile

### âœ… Security
- [ ] Rate limiting works for general endpoints
- [ ] Stricter rate limiting works for auth endpoints
- [ ] JWT tokens are properly validated
- [ ] Protected routes require authentication
- [ ] Role-based access control works

### âœ… Error Handling
- [ ] Invalid email formats are rejected
- [ ] Duplicate registrations are prevented
- [ ] Invalid OTPs are rejected
- [ ] Expired OTPs are rejected
- [ ] Invalid credentials are rejected

## íº€ Performance Testing

### Load Testing with Apache Bench
```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost:5000/health

# Test customer signup (should hit rate limit)
ab -n 100 -c 5 -p customer_signup.json -T application/json http://localhost:5000/api/auth/customer/signup
```

### Memory and CPU Monitoring
```bash
# Monitor server performance
top -p $(pgrep -f "ts-node-dev")

# Monitor memory usage
ps aux | grep ts-node-dev
```

This comprehensive testing guide ensures your Qmart API is production-ready! íº€
