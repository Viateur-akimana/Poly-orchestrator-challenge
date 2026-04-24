# SKYLINE Transfers Backend API

A secure and scalable backend API for SKYLINE Transfers - a money transfer service that enables Rwandans residing in Russia to send money home via MTN Mobile Money. This system addresses the challenge of international transfers from Russia to Rwanda during sanctions by using domestic Russian banking (SBP) and MTN Mobile Money integration with a pre-funded inventory system for fast, secure transfers.

## 📑 Table of Contents

- [Problem & Solution](#-problem--solution)
- [Business Model](#-business-model)
- [Features](#-features)
- [Workflows](#-workflows)
  - [User Workflow](#-user-workflow-russia--rwanda-transfer)
  - [Admin Workflow](#-admin-workflow)
  - [Overall Application Workflow](#-overall-application-workflow)
  - [Security & Compliance Flow](#-security--compliance-flow)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Authentication](#-authentication)
- [Transfer Flow Details](#-transfer-flow-details)
- [Configuration](#-configuration)
- [Bank Alerts Processing](#bank-alerts-email--webhook-ingestion)
- [Testing](#-testing)
- [Development](#-development)
- [Deployment](#-deployment)
- [Security Features](#-security-features)
- [Monitoring & Logging](#-monitoring--logging)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [Troubleshooting](#-troubleshooting)
- [Contact](#-contact)

## 🎯 Problem & Solution

**Problem**: Due to international sanctions, Rwandans in Russia face difficulties sending money home via traditional international transfer services. Existing alternatives are expensive and lack transparency.

**Solution**: SKYLINE provides a domestic Russian payment solution (SBP - Sistema Bystrykh Platezhey) with fast MTN Mobile Money payouts in Rwanda using a pre-funded inventory system.

## 💰 Business Model

- **No Commission**: Transparent pricing with no hidden fees
- **Exchange Rate**: Real-time RUB to RWF rates with minimal markup
- **Fast Processing**: Instant to 3 hours using Rwanda inventory system
- **Inventory Model**: Pre-funded Rwanda balance enables immediate recipient payouts upon payment verification
- **Target Market**: Rwandans residing in Russia

## 🚀 Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control (USER, ADMIN, SUPPORT, COMPLIANCE, FINANCE)
- **Transfer Orders**: Create, manage, and track money transfer orders with real-time status updates
- **SBP Integration**: Russian Sistema Bystrykh Platezhey for domestic payments (sanctions-compliant)
- **MTN Mobile Money Integration**: Direct integration with MTN MoMo API for instant payments in Rwanda
- **Payment Proof Upload**: Secure file upload for payment verification
- **Automated Bank Alert Processing**: Webhook endpoint for automatic payment verification via bank email alerts
- **Exchange Rate Management**: Real-time exchange rate calculations with transparent pricing
- **Audit Logging**: Comprehensive audit trail for all transactions and admin actions
- **Notification System**: Multi-channel notifications (Email, SMS, Push, In-App)
- **Admin Dashboard**: Administrative interface for managing transfers, verification, and statistics
- **API Documentation**: Comprehensive Swagger/OpenAPI 3.0 documentation

## 📊 Workflows

### 👤 User Workflow (Russia → Rwanda Transfer)

```mermaid
graph TD
    A[User Registers/Logs In] --> B[Create Transfer Order]
    B --> C[Get Bank Payment Details]
    C --> D[Transfer RUB via SBP to SKYLINE Account]
    D --> E[Upload Payment Proof]
    E --> F[Wait for Admin Verification]
    F --> G{Payment Verified?}
    G -->|Yes| H[MTN Disbursement Initiated]
    G -->|No| I[Rejection Notification]
    H --> J[Recipient Receives Money]
    J --> K[Transfer Complete - Notification Sent]
    I --> L[Refund Process if Payment Made]
```

**Detailed User Steps:**

1. **Registration & Login**
   - Create account with email, phone, and password
   - Complete KYC verification (name, identity documents)
   - Receive JWT access token

2. **Create Transfer Order**
   - Specify recipient details (name, MTN phone number)
   - Enter amount to send in RUB
   - View transparent breakdown: Amount, with no hidden fees
   - See expected RWF amount recipient will receive
   - Confirm order creation

3. **Make Payment**
   - Receive SKYLINE Russian bank account details
   - Get unique reference number (e.g., TRF20240911001)
   - Transfer money via SBP (Sistema Bystrykh Platezhey) - domestic Russian payment
   - Include reference number in payment description

4. **Upload Payment Proof**
   - Take screenshot of payment confirmation
   - Upload via API or web interface
   - System changes status to "PAYMENT_UPLOADED"

5. **Verification & Processing**
   - Automatic verification via bank alert webhook (instant) OR
   - Admin manual verification (within 1-3 hours)
   - Receive notification when payment is verified

6. **Receive Confirmation**
   - MTN Mobile Money automatically sends money to recipient
   - Both sender and recipient receive notifications
   - Transfer marked as "COMPLETED"
   - View receipt and transaction history

### 👨‍💼 Admin Workflow

```mermaid
graph TD
    A[Admin Logs In] --> B[View Dashboard]
    B --> C[Monitor All Transfers]
    C --> D[Check Pending Verifications]
    D --> E{Review Payment Proof}
    E -->|Valid| F[Approve Transfer]
    E -->|Invalid| G[Reject Transfer]
    F --> H[Trigger MTN Disbursement]
    H --> I{MTN Payment Success?}
    I -->|Yes| J[Mark Complete]
    I -->|No| K[Retry or Manual Investigation]
    G --> L[Notify User with Reason]
    J --> M[Monitor Statistics]
    K --> M
    L --> M
```

**Detailed Admin Steps:**

1. **Dashboard Access**
   - Login with admin credentials
   - View real-time statistics:
     - Total transfers (today, week, month)
     - Pending verifications count
     - Completed transfers
     - Total revenue (commissions)
     - Inventory balance

2. **Payment Verification**
   - Access list of transfers with "PAYMENT_UPLOADED" status
   - Review payment proof images/documents
   - Verify payment details match:
     - Amount (RUB)
     - Reference number
     - Bank account
     - Timestamp
   - Decision: Approve or Reject

3. **Approve Transfer**
   - Click "Verify Payment" button
   - System automatically:
     - Updates status to "PAYMENT_VERIFIED"
     - Triggers MTN Mobile Money API call
     - Sends RWF to recipient's phone
     - Creates audit log entry
     - Sends notifications to both parties

4. **Reject Transfer (if invalid)**
   - Select rejection reason
   - Add admin notes
   - Notify user with explanation
   - Initiate refund process if needed

5. **Monitor MTN Disbursements**
   - View processing status
   - Handle failed payments
   - Manually retry or investigate issues
   - Track MTN webhook responses

6. **Manage Statistics & Reports**
   - View transfer analytics
   - Monitor exchange rates
   - Check inventory levels
   - Generate financial reports
   - Review audit logs

### 🔄 Overall Application Workflow

```mermaid
graph TB
    subgraph "Frontend/Client"
        A[Web Application]
        B[Mobile App]
    end
    
    subgraph "Backend API"
        C[Express.js Server]
        D[Authentication Middleware]
        E[Transfer Controller]
        F[Admin Controller]
    end
    
    subgraph "Business Logic"
        G[Transfer Service]
        H[MTN Service]
        I[SBP Payment Service]
        J[Exchange Rate Service]
    end
    
    subgraph "External Services"
        K[Russian Bank/SBP]
        L[MTN Mobile Money API]
        M[Email Alerts Webhook]
    end
    
    subgraph "Data Storage"
        N[PostgreSQL Database]
        O[Prisma ORM]
        P[File Storage/S3]
    end
    
    subgraph "Monitoring & Security"
        Q[Audit Logs]
        R[Winston Logger]
        S[JWT Auth]
    end
    
    A --> C
    B --> C
    C --> D
    D --> E
    D --> F
    E --> G
    F --> G
    G --> H
    G --> I
    G --> J
    G --> O
    H --> L
    I --> K
    K --> M
    M --> C
    O --> N
    E --> P
    G --> Q
    C --> R
    D --> S
```

**System Flow:**

1. **User Request** → Frontend sends request to Backend API
2. **Authentication** → JWT middleware validates user token
3. **Controller** → Routes request to appropriate controller
4. **Service Layer** → Business logic processes the request
5. **External APIs** → Communicates with MTN, SBP, banks
6. **Database** → Prisma ORM manages PostgreSQL operations
7. **Response** → JSON response sent back to client
8. **Logging** → All actions logged for audit trail

### 🔐 Security & Compliance Flow

```mermaid
graph LR
    A[User Request] --> B{Authenticated?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D{Authorized Role?}
    D -->|No| E[403 Forbidden]
    D -->|Yes| F[Process Request]
    F --> G[Validate Input]
    G --> H[Business Logic]
    H --> I[Audit Log Entry]
    I --> J[Database Transaction]
    J --> K[Response + Notification]
```

## 🏗️ Architecture

### Tech Stack
- **Runtime**: Node.js (v16+) with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens (access + refresh)
- **File Storage**: AWS S3 (configurable) or local storage
- **Email**: Nodemailer with SMTP
- **Payment Systems**: 
  - SBP (Sistema Bystrykh Platezhey) for Russia
  - MTN Mobile Money API for Rwanda
- **Documentation**: Swagger/OpenAPI 3.0
- **Logging**: Winston with daily rotation
- **Validation**: class-validator and express-validator

### Key Components
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and external API integrations
- **Middleware**: Authentication, validation, error handling, rate limiting
- **DTOs**: Data transfer objects with validation
- **Types**: TypeScript type definitions
- **Utils**: Helper functions and utilities
- **Config**: Business rules, payment config, environment settings

### Inventory System Architecture

The Rwanda inventory system is central to SKYLINE's fast transfer capability:

1. **Pre-funded Balance**: SKYLINE maintains RWF balance with MTN Mobile Money
2. **Instant Payouts**: Recipients receive money immediately upon verification
3. **Inventory Replenishment**: Customer RUB payments replenish the RWF inventory
4. **Benefits**:
   - No waiting for international transfers
   - Instant recipient satisfaction
   - Better exchange rates
   - Reduced transaction costs

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager
- MTN Mobile Money API credentials (for production)
- Russian bank account with SBP support (for production)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skyline/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/skyline_transfers"
   
   # JWT
   JWT_SECRET=your_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_refresh_token_secret_here
   
   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   
   # MTN Mobile Money
   MTN_API_KEY=your_mtn_api_key
   MTN_USER_ID=your_mtn_user_id
   MTN_PRIMARY_KEY=your_mtn_primary_key
   
   # Admin
   ADMIN_EMAIL=admin@skyline-transfers.com
   ADMIN_PASSWORD=secure_admin_password
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   
   # Seed the database (optional)
   npm run db:seed
   ```

## 🚀 Running the Application

### Development Mode
```bash
# Full application with all features
npm run dev

# Simple server with mock data (for testing/demo)
npm run dev:simple
```

### Bank Alerts (Email) – Webhook Ingestion

SKYLINE includes an automated bank alert processing system that enables instant payment verification:

#### How It Works

1. **Email Integration**: Connect your Russian bank email account to email service (Nylas, Microsoft Graph)
2. **Webhook Configuration**: Service forwards bank alerts to SKYLINE webhook
3. **Automatic Parsing**: System extracts transfer reference and amount
4. **Instant Verification**: Matching transfers are automatically verified
5. **MTN Disbursement**: Payment to recipient initiated immediately

#### Webhook Endpoint

```
POST /api/bank-alerts/ingest
Content-Type: application/json
```

**Payload:**
```json
{
  "from": "bank@alerts.example",
  "subject": "Зачисление TRF20240911001",
  "body": "Сумма: 12 345 RUB. Комментарий: TRF20240911001",
  "date": "2025-09-11T10:05:00Z"
}
```

**Processing Logic:**
- Parses reference number (e.g., TRF20240911001) from subject/body
- Extracts amount in RUB from Russian bank formats:
  - "Сумма: 12 345 RUB"
  - "12,345.00 ₽"
  - "12345 руб"
- Finds transfer order in `PENDING_PAYMENT` status by reference
- Validates amount matches order total (±1 RUB tolerance)
- Auto-verifies transfer if match found
- Creates audit log entry
- Triggers MTN disbursement

#### Connecting Email Services

**Nylas Configuration:**
```javascript
// Webhook configuration for Nylas
{
  "trigger": "message.created",
  "webhook_url": "https://your-domain.com/api/bank-alerts/ingest",
  "filters": {
    "from": "alerts@your-bank.ru"
  }
}
```

**Microsoft Graph Setup:**
```javascript
// Create subscription for Microsoft Graph
POST https://graph.microsoft.com/v1.0/subscriptions
{
  "changeType": "created",
  "notificationUrl": "https://your-domain.com/api/bank-alerts/ingest",
  "resource": "/me/messages",
  "expirationDateTime": "2025-12-31T23:59:59.000Z"
}
```

#### Security Hardening

**Recommended practices:**
1. Use shared secret header for webhook authentication:
   ```
   X-Webhook-Secret: your-secret-key-here
   ```
2. IP allowlist at reverse proxy level
3. Rate limiting on webhook endpoint
4. Validate email source authenticity
5. Log all webhook requests for audit

#### Example curl Test

```bash
curl -X POST http://localhost:5004/api/bank-alerts/ingest \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "from": "bank@alerts.example",
    "subject": "Зачисление TRF20240911001",
    "body": "Сумма: 12 345 RUB. Комментарий: TRF20240911001",
    "date": "2025-09-11T10:05:00Z"
  }'
```

#### Benefits

- ⚡ **Instant Verification**: No manual admin review needed
- 🎯 **High Accuracy**: Automated amount and reference matching
- 📊 **Audit Trail**: All alerts logged for compliance
- ⏱️ **24/7 Processing**: Works outside business hours
- 🔒 **Secure**: Multiple validation layers

### Production Mode
```bash
# Build the application
npm run build

# Start the production server
npm start
```

## 📚 API Documentation

The API documentation is available via Swagger UI:

- **Development**: http://localhost:5004/api-docs
- **Health Check**: http://localhost:5004/health
- **System Overview**: http://localhost:5004/api/system/overview

### Key Endpoints

#### 🔓 Public Endpoints (No Authentication Required)

##### Exchange Rates
- `GET /api/transfer-orders/exchange-rate` - Get current RUB to RWF exchange rate
  - Response includes: rate, commission, calculation example

##### Bank Details
- `GET /api/transfer-orders/bank-details` - Get Russian bank account details for payments
  - Returns: bank name, account number, BIK, reference number format

##### Payment Information
- `GET /api/transfers/payment/info` - Get SBP payment methods and supported banks

#### 🔐 Authentication Endpoints

- `POST /api/auth/register` - Register a new user
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+250788123456"
  }
  ```

- `POST /api/auth/login` - User login
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
  Returns: `accessToken`, `refreshToken`, `user` object

- `GET /api/auth/me` - Get current user profile (requires authentication)
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - User logout

#### 💸 Transfer Endpoints (User - Requires Authentication)

##### Create Transfer
- `POST /api/transfer-orders` - Create a new transfer order
  ```json
  {
    "recipientName": "Jane Doe",
    "recipientPhone": "+250788123456",
    "amount": 10000,
    "description": "Family support"
  }
  ```
  Returns: Transfer order with reference number, payment instructions

##### Manage Transfers
- `GET /api/transfer-orders` - Get user's transfer orders (paginated)
  - Query params: `page`, `limit`, `status`
  
- `GET /api/transfer-orders/:id` - Get specific transfer order details

- `POST /api/transfer-orders/:id/payment-proof` - Upload payment proof
  - Content-Type: `multipart/form-data`
  - Field: `paymentProof` (image file: JPG, PNG, PDF)

- `POST /api/transfer-orders/:id/cancel` - Cancel a pending transfer
  ```json
  {
    "reason": "Changed mind"
  }
  ```

##### Bidirectional Transfers
- `POST /api/transfers/russia-to-rwanda` - Create Russia → Rwanda transfer (SBP → MTN)
- `POST /api/transfers/rwanda-to-russia` - Create Rwanda → Russia transfer (MTN → SBP)

#### 👨‍💼 Admin Endpoints (Requires Admin Role)

##### Transfer Management
- `GET /api/transfer-orders/admin/orders` - Get all transfer orders (paginated)
  - Query params: `page`, `limit`, `status`, `userId`
  
- `GET /api/transfers/admin/all` - Get all transfers with advanced filtering

- `PUT /api/transfer-orders/:id/status` - Update transfer status
  ```json
  {
    "status": "PAYMENT_VERIFIED",
    "notes": "Payment confirmed"
  }
  ```

##### Payment Verification
- `POST /api/transfer-orders/:id/verify` - Verify payment and approve transfer
  ```json
  {
    "verified": true,
    "notes": "Payment matches order"
  }
  ```

##### MTN Processing
- `POST /api/transfer-orders/:id/process` - Process transfer (initiate MTN payment)
- `POST /api/transfers/admin/:transferId/process-mtn` - Manually trigger MTN disbursement

##### Statistics & Reports
- `GET /api/transfer-orders/admin/statistics` - Get transfer statistics
  - Returns: total transfers, revenue, pending count, completion rate

##### User Management
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role

#### 🔔 Webhook Endpoints

##### Bank Alerts (Payment Verification)
- `POST /api/bank-alerts/ingest` - Process bank alert email for automatic payment verification
  ```json
  {
    "from": "bank@alerts.example",
    "subject": "Зачисление TRF20240911001",
    "body": "Сумма: 12 345 RUB. Комментарий: TRF20240911001",
    "date": "2025-09-11T10:05:00Z"
  }
  ```

##### Payment Provider Webhooks
- `POST /api/transfers/webhook/sbp` - SBP payment webhook (Russia → Rwanda)
- `POST /api/transfers/webhook/mtn` - MTN payment webhook (Rwanda → Russia)

#### 📊 System Endpoints

- `GET /api/system/overview` - Get complete system overview and features
- `GET /api/system/health` - Get system health status

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Register/Login** to get access and refresh tokens
2. **Include the access token** in the Authorization header:
   ```
   Authorization: Bearer <your-access-token>
   ```
3. **Refresh tokens** when access tokens expire (access tokens expire in 1 hour, refresh tokens in 7 days)

### User Roles & Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| **USER** | Regular customers | Create/view own transfers, upload payment proofs, check rates |
| **ADMIN** | System administrators | All USER permissions + verify payments, process transfers, view all orders, manage users |
| **SUPPORT** | Customer support | View transfers, assist users, limited admin access |
| **COMPLIANCE** | Compliance team | Audit logs, review transfers, compliance checks |
| **FINANCE** | Financial team | Reports, reconciliation, financial analytics |

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    
    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Validate credentials
    Database-->>Backend: User data
    Backend-->>Frontend: Access Token + Refresh Token
    Frontend->>Backend: API Request + Access Token
    Backend->>Backend: Verify JWT
    Backend-->>Frontend: Protected Resource
    
    Note over Frontend,Backend: After 1 hour
    Frontend->>Backend: POST /api/auth/refresh
    Backend-->>Frontend: New Access Token
```

## 💰 Transfer Flow Details

### Complete Transfer Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Create Order
    PENDING --> PAYMENT_UPLOADED: Upload Proof
    PAYMENT_UPLOADED --> PAYMENT_VERIFIED: Admin Approval
    PAYMENT_UPLOADED --> REJECTED: Admin Rejection
    PAYMENT_VERIFIED --> PROCESSING: Initiate MTN
    PROCESSING --> COMPLETED: MTN Success
    PROCESSING --> FAILED: MTN Failed
    FAILED --> PROCESSING: Retry
    FAILED --> REFUNDED: Manual Refund
    REJECTED --> REFUNDED: Refund Process
    COMPLETED --> [*]
    REFUNDED --> [*]
```

### Status Definitions

| Status | Description | User Action | Admin Action |
|--------|-------------|-------------|--------------|
| `PENDING` | Order created, awaiting payment | Make bank transfer | Monitor |
| `PAYMENT_UPLOADED` | Payment proof uploaded | Wait for verification | Review & verify |
| `PAYMENT_VERIFIED` | Payment confirmed by admin | - | Initiate MTN transfer |
| `PROCESSING` | MTN payment being processed | Wait for completion | Monitor MTN API |
| `COMPLETED` | Transfer successful | View receipt | Archive |
| `FAILED` | MTN payment failed | Contact support | Investigate & retry |
| `REJECTED` | Payment proof rejected | Resubmit or refund | Process refund |
| `CANCELLED` | User cancelled before payment | - | Close order |
| `REFUNDED` | Payment refunded to user | Check bank account | Process refund |

### Transfer Processing Steps

1. **Order Creation**: 
   - User submits recipient details and amount
   - System calculates total (amount + 0 commission)
   - Generates unique reference number (e.g., TRF20240911001)
   - Status: `PENDING`

2. **Russian Payment**:
   - User receives SKYLINE bank details
   - Transfers RUB via SBP (domestic Russian banking)
   - Must include reference number in payment description
   - Status: Still `PENDING`

3. **Proof Upload**:
   - User uploads payment receipt/screenshot
   - System stores file securely (AWS S3 or local)
   - Status: `PAYMENT_UPLOADED`

4. **Verification** (Automatic or Manual):
   - **Automatic**: Bank alert webhook matches payment → instant verification
   - **Manual**: Admin reviews proof within 1-3 hours
   - Validates: amount, reference number, timestamp
   - Status: `PAYMENT_VERIFIED` or `REJECTED`

5. **MTN Disbursement**:
   - System calls MTN Mobile Money API
   - Sends RWF to recipient's phone number
   - Uses pre-funded inventory for instant transfer
   - Status: `PROCESSING` → `COMPLETED`

6. **Notifications**:
   - Email notifications at each status change
   - SMS to recipient when money sent
   - In-app notifications for real-time updates

### Pricing Breakdown Example

For a 10,000 RUB transfer:
```
Send Amount:        10,000 RUB
Commission:              0 RUB
──────────────────────────────
Total to Pay:      10,000 RUB

Exchange Rate:     14 RWF/RUB
Receive Amount:   140,000 RWF
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| **Database** |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| **JWT Authentication** |
| `JWT_SECRET` | Secret key for access tokens | Yes | - |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | Yes | - |
| `JWT_EXPIRES_IN` | Access token expiration | No | 1h |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | No | 7d |
| **Email/SMTP** |
| `SMTP_HOST` | Email server hostname | Yes | smtp.gmail.com |
| `SMTP_PORT` | Email server port | Yes | 587 |
| `SMTP_USER` | Email username | Yes | - |
| `SMTP_PASSWORD` | Email password/app password | Yes | - |
| `SMTP_FROM` | From email address | No | noreply@skyline.com |
| **MTN Mobile Money** |
| `MTN_API_KEY` | MTN Mobile Money API key | Yes* | - |
| `MTN_USER_ID` | MTN API user ID | Yes* | - |
| `MTN_PRIMARY_KEY` | MTN API primary key | Yes* | - |
| `MTN_ENVIRONMENT` | MTN environment | No | sandbox |
| **SBP (Sistema Bystrykh Platezhey)** |
| `SBP_MERCHANT_ID` | SBP merchant ID | Yes* | - |
| `SBP_API_KEY` | SBP API key | Yes* | - |
| **AWS S3 (Optional)** |
| `AWS_ACCESS_KEY_ID` | AWS access key | No | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | No | - |
| `AWS_REGION` | AWS region | No | us-east-1 |
| `AWS_S3_BUCKET` | S3 bucket name | No | - |
| **Application** |
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment mode | No | development |
| `CLIENT_URL` | Frontend application URL | Yes | http://localhost:3000 |
| `API_BASE_URL` | Backend base URL | No | http://localhost:5000 |
| **Admin** |
| `ADMIN_EMAIL` | Default admin email | Yes | admin@skyline.com |
| `ADMIN_PASSWORD` | Default admin password | Yes | - |
| **Exchange Rates** |
| `EXCHANGE_RATE_API_KEY` | Exchange rate API key | No | - |
| `DEFAULT_EXCHANGE_RATE` | Fallback rate (RUB to RWF) | No | 14 |

\* Required for production, optional for development/testing

### Database Schema

The application uses Prisma ORM with PostgreSQL. Key entities:

#### Core Entities

**User**
```typescript
{
  id: string
  email: string (unique)
  password: string (hashed)
  firstName: string
  lastName: string
  phone: string
  role: UserRole (USER, ADMIN, SUPPORT, COMPLIANCE, FINANCE)
  emailVerified: boolean
  phoneVerified: boolean
  kycStatus: KYCStatus
  createdAt: DateTime
  updatedAt: DateTime
}
```

**TransferOrder**
```typescript
{
  id: string
  referenceNumber: string (unique, e.g., TRF20240911001)
  userId: string
  senderName: string
  senderPhone: string
  recipientName: string
  recipientPhone: string
  sendAmount: Decimal (RUB)
  receiveAmount: Decimal (RWF)
  commission: Decimal (0 RUB)
  exchangeRate: Decimal
  status: TransferStatus
  paymentProofUrl: string?
  mtnTransactionId: string?
  sbpTransactionId: string?
  paidAt: DateTime?
  verifiedAt: DateTime?
  completedAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
}
```

**PaymentProof**
```typescript
{
  id: string
  transferId: string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: DateTime
}
```

**ExchangeRate**
```typescript
{
  id: string
  fromCurrency: string (RUB)
  toCurrency: string (RWF)
  rate: Decimal
  source: string
  validFrom: DateTime
  validUntil: DateTime?
  createdAt: DateTime
}
```

**Notification**
```typescript
{
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  sentAt: DateTime
  readAt: DateTime?
}
```

**AuditLog**
```typescript
{
  id: string
  userId: string?
  action: string
  entity: string
  entityId: string?
  changes: JSON
  ipAddress: string?
  userAgent: string?
  createdAt: DateTime
}
```

#### Enums

```typescript
enum UserRole {
  USER
  ADMIN
  SUPPORT
  COMPLIANCE
  FINANCE
}

enum TransferStatus {
  PENDING              // Order created, awaiting payment
  PAYMENT_UPLOADED     // Proof uploaded, awaiting verification
  PAYMENT_VERIFIED     // Payment confirmed by admin
  PROCESSING           // MTN disbursement in progress
  COMPLETED            // Transfer successful
  FAILED               // MTN payment failed
  REJECTED             // Payment proof rejected
  CANCELLED            // User cancelled
  REFUNDED             // Payment refunded
}

enum KYCStatus {
  NOT_STARTED
  PENDING
  APPROVED
  REJECTED
}

enum NotificationType {
  ORDER_CREATED
  PAYMENT_UPLOADED
  PAYMENT_VERIFIED
  PAYMENT_REJECTED
  TRANSFER_COMPLETED
  TRANSFER_FAILED
  SYSTEM_ALERT
}
```

### Business Configuration

Located in `src/config/business.config.ts`:

```typescript
{
  COMMISSION_RUB: 0,                // No commission
  MINIMUM_TRANSFER_RUB: 100,        // Minimum send amount
  MAXIMUM_TRANSFER_RUB: 500000,     // Maximum send amount
  DEFAULT_EXCHANGE_RATE: 14,        // RUB to RWF fallback rate
  STANDARD_PROCESSING_HOURS: 3,     // Max processing time
  EXPRESS_PROCESSING_HOURS: 1,      // Target processing time
  INVENTORY_MODEL: true,            // Use pre-funded inventory
  INSTANT_RECIPIENT_PAYMENT: true,  // Pay recipients immediately
  RUSSIAN_BANK_DOMESTIC: true,      // Domestic payments only
  DAILY_LIMIT_RUB: 100000,          // Per-user daily limit
  MONTHLY_LIMIT_RUB: 1000000        // Per-user monthly limit
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## 📝 Development

### Code Style
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Operations
```bash
# View database in Prisma Studio
npm run db:studio

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset
```

## 🚀 Deployment

### Docker Deployment (Recommended)

**Using Docker Compose:**

1. **Clone and configure:**
   ```bash
   git clone <repository-url>
   cd skyline-backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Build and run:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

**Docker Compose services:**
- `backend`: Node.js API server
- `postgres`: PostgreSQL database
- `redis` (optional): Caching layer

**Using standalone Docker:**

```bash
# Build image
docker build -t skyline-backend:latest .

# Run container
docker run -d \
  -p 5000:5000 \
  --env-file .env \
  --name skyline-api \
  skyline-backend:latest
```

### Cloud Deployment

#### Deploy to Render

1. Connect GitHub repository to Render
2. Select "Web Service"
3. Configure:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Add all `.env` variables
4. Add PostgreSQL database service
5. Deploy

#### Deploy to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add PostgreSQL: `railway add postgresql`
5. Deploy: `railway up`

#### Deploy to Heroku

```bash
# Install Heroku CLI
heroku login

# Create app
heroku create skyline-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set NODE_ENV=production
# ... add all other env vars

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:migrate
```

#### Deploy to AWS (EC2 + RDS)

1. **Set up RDS PostgreSQL instance**
2. **Launch EC2 instance** (Ubuntu 22.04 LTS)
3. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm postgresql-client nginx
   ```
4. **Clone and build:**
   ```bash
   git clone <repository-url>
   cd skyline-backend
   npm install
   npm run build
   ```
5. **Configure environment variables**
6. **Set up PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name skyline-api
   pm2 startup
   pm2 save
   ```
7. **Configure Nginx as reverse proxy**

### Manual Deployment Checklist

**Pre-deployment:**
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set strong JWT secrets
- [ ] Configure email service
- [ ] Set up MTN production API keys
- [ ] Configure SBP production credentials
- [ ] Set up file storage (AWS S3 or similar)
- [ ] Configure SSL/TLS certificates
- [ ] Set up domain and DNS

**Build & Deploy:**
1. Install dependencies: `npm install --production`
2. Build TypeScript: `npm run build`
3. Run database migrations: `npm run db:migrate`
4. (Optional) Seed initial data: `npm run db:seed`
5. Start application: `npm start`

**Post-deployment:**
- [ ] Verify health endpoint: `GET /health`
- [ ] Test authentication flow
- [ ] Verify database connections
- [ ] Test transfer creation
- [ ] Check email delivery
- [ ] Verify MTN API integration
- [ ] Set up monitoring alerts
- [ ] Configure log aggregation
- [ ] Enable backup automation
- [ ] Set up CDN for static files (if applicable)

### Environment-Specific Configuration

**Development:**
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://localhost:5432/skyline_dev
MTN_ENVIRONMENT=sandbox
LOG_LEVEL=debug
```

**Staging:**
```env
NODE_ENV=staging
PORT=5000
DATABASE_URL=postgresql://staging-db:5432/skyline_staging
MTN_ENVIRONMENT=sandbox
LOG_LEVEL=info
```

**Production:**
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://prod-db:5432/skyline_production
MTN_ENVIRONMENT=production
LOG_LEVEL=warn
```

### Backup & Disaster Recovery

**Database Backups:**
```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup-20250111.sql
```

**Automated Backups:**
- Daily database backups to S3
- Transaction log backups (point-in-time recovery)
- File storage backups
- Configuration backups

**Disaster Recovery Plan:**
1. Database failover to standby instance
2. Application server auto-scaling
3. CDN and cache layer for resilience
4. Regular backup testing
5. Documented recovery procedures

## 🔒 Security Features

SKYLINE implements multiple layers of security to protect user data and financial transactions:

### Authentication & Authorization
- ✅ **JWT Authentication**: Token-based auth with automatic expiration
- ✅ **Refresh Tokens**: Secure token refresh mechanism (7-day expiry)
- ✅ **Password Hashing**: bcrypt with salt rounds for secure password storage
- ✅ **Role-Based Access Control (RBAC)**: Fine-grained permissions by user role
- ✅ **Session Management**: Secure session handling with automatic cleanup

### API Security
- ✅ **Rate Limiting**: Request throttling to prevent abuse (100 req/15min per IP)
- ✅ **CORS Protection**: Configured cross-origin resource sharing
- ✅ **Helmet.js**: Security headers (XSS, clickjacking, etc.)
- ✅ **Input Validation**: Comprehensive validation using express-validator
- ✅ **SQL Injection Prevention**: Prisma ORM parameterized queries
- ✅ **XSS Protection**: Input sanitization and output encoding

### File Upload Security
- ✅ **File Type Validation**: Only allowed MIME types (images, PDF)
- ✅ **File Size Limits**: Maximum 10MB per file
- ✅ **Secure Storage**: AWS S3 with signed URLs or encrypted local storage
- ✅ **Virus Scanning**: Optional ClamAV integration
- ✅ **Unique Filenames**: UUID-based naming to prevent conflicts

### Payment Security
- ✅ **Payment Proof Verification**: Multi-step verification workflow
- ✅ **Amount Validation**: Server-side amount matching (±1 RUB tolerance)
- ✅ **Reference Validation**: Unique reference number per transfer
- ✅ **Double-Spend Prevention**: Status-based transaction locking
- ✅ **Webhook Verification**: Secret-based webhook authentication

### Data Protection
- ✅ **Encryption at Rest**: Encrypted database fields for sensitive data
- ✅ **Encryption in Transit**: HTTPS/TLS for all communications
- ✅ **PII Protection**: Personal data encrypted and access-controlled
- ✅ **Audit Logging**: Comprehensive audit trail for all actions
- ✅ **Data Retention**: Configurable data retention policies

### Compliance & Monitoring
- ✅ **KYC/AML Compliance**: Know Your Customer verification
- ✅ **Transaction Limits**: Daily and monthly limits per user
- ✅ **Suspicious Activity Detection**: Pattern-based fraud detection
- ✅ **Audit Logs**: Immutable audit trail for compliance
- ✅ **Admin Activity Logging**: All admin actions tracked

### Infrastructure Security
- ✅ **Environment Variables**: Sensitive config in environment vars
- ✅ **Secret Management**: No hardcoded secrets in code
- ✅ **Database Security**: Encrypted connections, limited access
- ✅ **API Key Rotation**: Regular rotation of API keys
- ✅ **Error Handling**: No sensitive data in error messages

### Security Best Practices Matrix

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **Network** | HTTPS/TLS | Enforced SSL/TLS 1.2+ |
| **Authentication** | JWT + Refresh | 1h access, 7d refresh |
| **Authorization** | RBAC | Role-based permissions |
| **Input** | Validation | express-validator + Prisma |
| **Output** | Sanitization | XSS protection enabled |
| **Storage** | Encryption | AES-256 for sensitive data |
| **Logging** | Audit Trail | Winston + database logs |
| **Monitoring** | Real-time | Health checks + alerts |

## 📊 Monitoring & Logging

### Logging System

SKYLINE uses Winston for structured logging with daily file rotation:

**Log Levels:**
- `error`: Application errors and exceptions
- `warn`: Warning messages and potential issues
- `info`: General information and important events
- `http`: HTTP request/response logging
- `debug`: Detailed debugging information

**Log Outputs:**
- Console (formatted for development)
- Daily rotating files (`logs/app-YYYY-MM-DD.log`)
- Error-specific files (`logs/error-YYYY-MM-DD.log`)
- JSON format for production parsing

**Log Structure:**
```json
{
  "timestamp": "2025-01-11T10:30:45.123Z",
  "level": "info",
  "message": "Transfer created successfully",
  "userId": "user-123",
  "transferId": "TRF20240911001",
  "amount": 10000,
  "metadata": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Health Monitoring

**Endpoints:**
- `GET /health` - Basic health check
  ```json
  {
    "status": "healthy",
    "uptime": 86400,
    "timestamp": "2025-01-11T10:30:45.123Z"
  }
  ```

- `GET /api/system/health` - Detailed system health
  ```json
  {
    "status": "healthy",
    "services": {
      "authentication": "operational",
      "transferOrders": "operational",
      "mtnIntegration": "operational",
      "database": "operational"
    },
    "environment": {
      "nodeVersion": "v18.17.0",
      "platform": "linux",
      "environment": "production"
    }
  }
  ```

### Performance Metrics

**Request Tracking:**
- Request duration logging
- Response time monitoring
- Endpoint usage statistics
- Error rate tracking

**Database Metrics:**
- Query execution time
- Connection pool status
- Transaction success rate
- Slow query logging

### Audit Trail

All significant actions are logged to the database:

**Logged Actions:**
- User authentication (login, logout, token refresh)
- Transfer creation and status changes
- Payment uploads and verifications
- Admin actions (approvals, rejections)
- Configuration changes
- Failed authentication attempts
- API errors and exceptions

**Audit Log Fields:**
```typescript
{
  id: string
  timestamp: DateTime
  userId: string?
  action: string          // e.g., "TRANSFER_CREATED"
  entity: string          // e.g., "TransferOrder"
  entityId: string?       // e.g., "TRF20240911001"
  changes: JSON          // Before/after values
  ipAddress: string?
  userAgent: string?
  status: string         // "SUCCESS" | "FAILURE"
}
```

### Error Tracking

**Error Handling Strategy:**
- Global error handler for all routes
- Specific error types (ValidationError, AuthError, etc.)
- Error sanitization (no sensitive data in responses)
- Automatic error logging
- User-friendly error messages

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "TRANSFER_NOT_FOUND",
    "message": "Transfer order not found",
    "statusCode": 404
  },
  "requestId": "req-abc123"
}
```

### Monitoring Best Practices

1. **Real-time Alerts**: Set up alerts for:
   - Failed MTN payments
   - High error rates
   - System health issues
   - Security events

2. **Dashboard Metrics**: Monitor:
   - Active transfers
   - Pending verifications
   - Completion rate
   - Average processing time
   - Revenue metrics

3. **Log Retention**: 
   - Keep logs for 90 days minimum
   - Archive logs to cold storage
   - Regular log analysis for patterns

4. **Performance Monitoring**:
   - Track API response times
   - Monitor database performance
   - Check external API latency (MTN, SBP)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support and questions:
- Email: support@skylinetransfers.com
- Documentation: http://localhost:5000/api-docs

## 🗺️ Roadmap

### Phase 1: Core Platform (Completed ✅)
- [x] User authentication & authorization
- [x] Transfer order management
- [x] Payment proof upload
- [x] Admin verification workflow
- [x] MTN Mobile Money integration
- [x] SBP payment integration
- [x] Bank alert webhook processing
- [x] Email notifications
- [x] Audit logging
- [x] API documentation (Swagger)

### Phase 2: Enhanced Features (In Progress 🚧)
- [x] Automated bank alert verification
- [x] Bidirectional transfers (Russia ↔️ Rwanda)
- [ ] Advanced fraud detection algorithms
- [ ] Real-time WebSocket notifications
- [ ] SMS notifications via Twilio
- [ ] Enhanced admin dashboard with analytics
- [ ] Mobile app API optimization

### Phase 3: Scalability & Expansion (Planned 📋)
- [ ] Multi-currency support (USD, EUR, CNY)
- [ ] Additional mobile money providers (Airtel Money, Tigo)
- [ ] Automated reconciliation system
- [ ] Advanced reporting and business intelligence
- [ ] API rate limiting per user tier
- [ ] Microservices architecture
- [ ] GraphQL API option

### Phase 4: Compliance & Enterprise (Future 🔮)
- [ ] Enhanced KYC/AML automation
- [ ] Regulatory reporting automation
- [ ] White-label solution for partners
- [ ] Multi-tenant architecture
- [ ] Advanced analytics dashboard
- [ ] Machine learning for fraud detection
- [ ] Blockchain audit trail
- [ ] API marketplace for third-party integrations

### Feature Requests

Have an idea? [Open an issue](https://github.com/Viateur-akimana/skyline-backend/issues) with the label `feature-request`.

## 🆘 Troubleshooting

### Common Issues

**Database Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running and `DATABASE_URL` is correct.

**JWT Token Expired**
```
Error: jwt expired
```
**Solution:** Use the refresh token to get a new access token via `/api/auth/refresh`.

**MTN Payment Failed**
```
Error: MTN API returned 500
```
**Solution:** 
1. Check MTN API credentials
2. Verify inventory balance
3. Check recipient phone number format (+250...)
4. Review MTN API logs

**File Upload Failed**
```
Error: File too large
```
**Solution:** Ensure file is under 10MB and in supported format (JPG, PNG, PDF).

**Rate Limit Exceeded**
```
Error: Too many requests
```
**Solution:** Wait 15 minutes or upgrade to higher tier.

### Debug Mode

Enable detailed logging:
```bash
LOG_LEVEL=debug npm run dev
```

### Support Channels

- 📧 **Email**: support@skylinetransfers.com
- 📚 **Documentation**: http://your-domain.com/api-docs
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Viateur-akimana/skyline-backend/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Viateur-akimana/skyline-backend/discussions)

## 📈 Performance

### Benchmarks

**API Response Times (avg):**
- Authentication: ~150ms
- Create transfer: ~200ms
- Upload file: ~300ms
- Get transfer list: ~100ms
- Admin verification: ~180ms

**Throughput:**
- 1000+ requests/minute per instance
- Horizontal scaling supported
- Database connection pooling enabled

**Optimization Tips:**
1. Use pagination for list endpoints
2. Enable Redis caching for exchange rates
3. Use CDN for static files
4. Enable gzip compression
5. Optimize database queries with indexes

## 🎯 Best Practices

### For Users

1. **Always include reference number** in payment description
2. **Upload clear payment proof** (high-quality image)
3. **Verify recipient phone number** before submitting
4. **Check exchange rates** before creating transfer
5. **Keep transfer receipt** for records

### For Administrators

1. **Verify payment details carefully** before approval
2. **Monitor pending verifications** regularly
3. **Check MTN disbursement logs** daily
4. **Review audit logs** for suspicious activity
5. **Maintain inventory balance** above threshold
6. **Respond to support tickets** within 24 hours

### For Developers

1. **Always validate input** on both client and server
2. **Use TypeScript types** for all data structures
3. **Write unit tests** for business logic
4. **Log all important actions** with context
5. **Handle errors gracefully** with user-friendly messages
6. **Document API changes** in changelog
7. **Review security** before deploying

## 📜 Changelog

### v1.0.0 (Current)
- Initial release
- Core transfer functionality
- User authentication
- Admin dashboard
- MTN integration
- SBP integration
- Bank alert processing
- Comprehensive API documentation

---

## 📞 Contact

**SKYLINE Transfers Team**

- 🌐 Website: https://skylinetransfers.com
- 📧 Email: info@skylinetransfers.com
- 🐙 GitHub: [@Viateur-akimana](https://github.com/Viateur-akimana)

---

**SKYLINE Transfers** - Making money transfers transparent, private, easy, and affordable between Russia and Rwanda.

## How payments are done (operations view)

High-level
- Method: Domestic Russian SBP transfer to SKYLINE’s account, reference-based matching
- Verification: Automatic via bank alert ingestion (SPF/DKIM/DMARC validated) with manual review fallback
- Payout: MTN Mobile Money to Rwanda on successful verification
- Fee: No commission (0 RUB)

Flow summary with statuses
1) Order creation (PENDING_PAYMENT)
- Endpoint: POST /api/transfers
- Response includes reference (e.g., TRF20240911001), RUB amount, RWF quote, and 0 fee.

2) Customer pays via SBP
- Payment comment must include the reference for auto-matching.
- Optional: user clicks “I Have Paid” and uploads proof (sets PAYMENT_UPLOADED/awaiting verification).

3) Automatic verification (PAYMENT_VERIFIED)
- Ingestion: POST /api/bank-alerts/ingest (from Gmail processor)
- gmail-bank-alert.service parses headers/body, validates SPF/DKIM/DMARC, extracts amount and reference.
- If reference and amount match within tolerance to a PENDING_PAYMENT order, status → PAYMENT_VERIFIED.
- Otherwise, flagged for manual review.

4) Manual verification (PAYMENT_VERIFIED or REJECTED)
- Admin reviews user proof and bank data via admin UI/services.
- manual-verification.service applies heuristics for mismatches/edge cases.

5) MTN payout (PAYOUT_IN_PROGRESS → COMPLETED)
- Triggered automatically on PAYMENT_VERIFIED by transfer.service using mtn-rwanda.service.
- Retries via utils/retry-handler.ts for transient MTN errors; final status COMPLETED on success or FAILED on permanent error.

Key services and routes
- services/gmail-bank-alert.service.ts — Email auth checks and parsing (SPF/DKIM/DMARC, amount/reference extraction).
- services/self-service-payment-enhanced.service.ts — Combines user-provided proof with alert signals.
- services/mtn-rwanda.service.ts — Initiates/disburses MTN Mobile Money payouts.
- routes/bank-alerts.routes.ts — Webhook/ingest for alerts.
- routes/self-service.routes.ts — “I Have Paid” flows.
- routes/transfer.routes.ts — Order lifecycle.

Operational notes
- Fraud prevention: Only alerts that pass SPF/DKIM/DMARC and bank-domain heuristics are treated as trusted.
- Missing reference: Expect manual review; encourage users to upload proof.
- Amount mismatch: Small tolerance allowed; larger variance requires admin approval.
- Monitoring: Use audit logs and metrics for verification/payout timing and failure analysis.
- SLA: Auto-verification is near-instant to 15 minutes; manual review 1–3 hours; MTN payout near real-time.

For complete details see:
- ../PAYMENT_IMPLEMENTATION_GUIDE.md
- ../MONEY_TRANSFER_PAYMENT_WORKFLOW.md
- ../COMPLETE_PAYMENT_IMPLEMENTATION.md
