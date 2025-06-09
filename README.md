# Qmart Fintech Backend API

A comprehensive fintech backend API for QR code-based payment transactions between customers and merchants.

## ��� Features

- **Dual User System**: Separate registration flows for customers and merchants
- **JWT Authentication**: Secure token-based authentication with HTTP-only cookies
- **OTP Verification**: Email-based account verification and password reset
- **Wallet Management**: Auto-generated account numbers and QR codes
- **Security**: Helmet, CORS, rate limiting, input sanitization
- **TypeScript**: Full type safety with functional programming approach

## ��� API Endpoints

### Health Check
```
GET /health
```

### API Information
```
GET /api
```

### Authentication Endpoints

#### Customer Registration
```
POST /api/auth/customer/signup
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Merchant Registration
```
POST /api/auth/merchant/signup
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567891"
}
```

#### Merchant Business Information
```
POST /api/auth/merchant/business-info
Content-Type: application/json

{
  "userId": "merchant_user_id",
  "businessName": "Jane's Store",
  "businessType": "retail",
  "businessAddress": {
    "street": "123 Main St",
    "city": "Lagos",
    "state": "Lagos",
    "zipCode": "100001",
    "country": "Nigeria"
  },
  "businessPhone": "+1234567891",
  "businessEmail": "business@example.com",
  "taxId": "TAX123456",
  "businessLicense": "LIC789012"
}
```

#### Email Verification
```
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### Customer Sign In
```
POST /api/auth/customer/signin
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123"
}
```

#### Merchant Sign In
```
POST /api/auth/merchant/signin
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "password123"
}
```

#### Forgot Password
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

#### Sign Out
```
POST /api/auth/signout
```

## ���️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Gmail account for email service

### Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Environment Configuration:**
Create a `.env` file with the following variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/qmart
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@qmart.com
OTP_EXPIRES_IN=15
OTP_LENGTH=6
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
```

3. **Start the server:**
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## ��� Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: Secure HTTP-only cookies
- **Rate Limiting**: Configurable request limits
- **Input Sanitization**: MongoDB injection prevention
- **CORS**: Configurable cross-origin requests
- **Helmet**: Security headers

## ��� Database Models

### User Model
- Unified customer/merchant model with role differentiation
- Email and phone uniqueness
- Password hashing with bcrypt
- Account verification status

### Wallet Model
- Unique 9-digit account numbers
- QR code generation
- Balance management
- User relationship

### OTP Model
- Email-based verification
- Expiration handling
- Type differentiation (verification/password_reset)
- Auto-cleanup of expired OTPs

### Merchant Profile Model
- Business information collection
- Address management
- Verification status

## ��� Testing

Test the API endpoints using curl or Postman:

```bash
# Test health check
curl http://localhost:5000/health

# Test customer signup
curl -X POST http://localhost:5000/api/auth/customer/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1234567890"
  }'
```

## ��� Project Structure

```
src/
├── Auth/
│   ├── customer/
│   │   ├── customer.controller.ts
│   │   ├── customer.model.ts
│   │   ├── customer.routes.ts
│   │   └── customer.service.ts
│   └── merchant/
│       └── merchant.model.ts
├── config/
│   ├── db.ts
│   └── email.ts
├── models/
│   └── otp.model.ts
├── schemas/
│   └── auth.schemas.ts
├── utils/
│   ├── accountNumber.ts
│   └── otp.ts
├── wallet/
│   └── customer/
│       └── model.ts
└── server.ts
```

## ��� Next Steps

1. **Add Input Validation**: Implement Zod validation middleware
2. **Add Rate Limiting**: Implement authentication-specific rate limits
3. **Add JWT Middleware**: Create authentication middleware for protected routes
4. **Add Wallet Operations**: Implement wallet transaction endpoints
5. **Add Testing**: Unit and integration tests
6. **Add Logging**: Structured logging with Winston
7. **Add Documentation**: OpenAPI/Swagger documentation

## ��� License

This project is licensed under the ISC License.
