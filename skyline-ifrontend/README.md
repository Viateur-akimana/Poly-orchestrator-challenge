# SKYLINE - International Money Transfer Platform

SKYLINE is a modern money transfer platform that enables users to send money from Russia to Rwanda quickly and securely. The platform features a user-friendly interface for customers and a comprehensive admin dashboard for managing transfers and users.

## Project info

**URL**: https://lovable.dev/projects/cc3c89d7-67e9-4413-b547-31d76dc3d8fc

## Overall Project Workflow

### System Architecture
SKYLINE is a full-stack application with the following components:

1. **Frontend**: React + TypeScript + Vite
2. **Backend API**: RESTful API for user authentication, transfers, and admin operations
3. **Payment Integration**: SBP (Fast Payment System) for instant payments
4. **MTN Mobile Money**: Disbursement to Rwanda via MTN Mobile Money

### Key Features
- 🔐 Secure user authentication with JWT tokens
- 💸 Real-time currency exchange (RUB to RWF)
- 📱 Mobile-responsive design
- 🚀 Fast transfer processing (96% faster than competitors)
- 👥 Admin dashboard for transfer and user management
- 📊 Analytics and reporting
- 🔔 Real-time notifications

## User Workflow

### 1. Registration & Authentication
**Step 1: Register**
- Navigate to `/register`
- Fill in user details:
  - First Name & Last Name
  - Email Address
  - Phone Number
  - Password
- Submit registration form
- Receive confirmation

**Step 2: Login**
- Navigate to `/login`
- Enter email and password
- Access user dashboard

### 2. User Dashboard
**Location**: `/dashboard`

**Features Available**:
- View account statistics (total transfers, completed, pending)
- Check current exchange rate (RUB to RWF)
- View recent transfer history
- Quick actions: Send Money, Track Transfer, View Profile

### 3. Send Money Workflow
**Location**: `/send-money` or `/transfers/new`

**Step-by-Step Process**:

**Step 1: Amount Entry**
- Enter amount in RUB
- View real-time conversion to RWF
- See transfer fee breakdown
- Total amount to pay displayed

**Step 2: Recipient Details**
- Enter recipient information:
  - First Name & Last Name
  - Phone Number (Rwanda format)
  - Mobile Network (MTN, Airtel)
- Add optional notes for recipient

**Step 3: Payment Method Selection**
- Choose payment method:
  - Bank Transfer (Tinkoff, Sber)
  - Cash
  - SBP (Instant payment)

**Step 4: Bank Details & Payment**
- View SKYLINE bank account details
- Transfer money using your preferred method
- Upload payment proof (screenshot/receipt)

**Step 5: Confirmation**
- Receive transfer order ID
- Track status in real-time
- Get notification when money is delivered

### 4. Track Transfers
**Location**: `/transfers` or `/track-transfer`

**Features**:
- View all transfer history
- Filter by status (Pending, Processing, Completed, Failed)
- Search by transfer ID
- View detailed transfer information
- Download receipts

**Transfer Statuses**:
- `PENDING`: Awaiting payment verification
- `PROCESSING`: Payment verified, processing disbursement
- `COMPLETED`: Money delivered to recipient
- `FAILED`: Transfer failed (with reason)
- `CANCELLED`: Transfer cancelled by user or admin

### 5. Profile Management
**Location**: `/profile`

**Available Actions**:
- View personal information
- Update contact details
- Change password
- View account statistics
- Notification preferences

## Admin Workflow

### 1. Admin Authentication
**Login**: Same login page (`/login`) with admin credentials
- System automatically redirects admins to admin dashboard

### 2. Admin Dashboard
**Location**: `/admin/dashboard`

**Overview Panel**:
- Total users count
- Total transfers (all time)
- Total volume (RUB & RWF)
- Pending reviews count
- Completed transfers
- Failed transfers
- Average processing time

**Quick Actions**:
- View all transfers
- Manage users
- View analytics
- System settings

### 3. Transfer Management
**Location**: `/admin/transfers`

**Features**:
- View all transfers across the platform
- Filter by:
  - Status (Pending, Processing, Completed, Failed)
  - Date range
  - Amount range
  - User/Recipient
- Search by transfer ID or user details

**Actions Per Transfer**:
- View full transfer details
- Verify payment proof
- Process MTN disbursement manually
- Update transfer status
- Add admin notes
- Cancel/Reject transfers with reason

**Transfer Processing Workflow**:
1. User creates transfer order
2. Admin verifies payment proof
3. Admin processes MTN disbursement
4. System updates status to COMPLETED
5. User and recipient receive notifications

### 4. User Management
**Location**: `/admin/users`

**Features**:
- View all registered users
- User statistics:
  - Total users
  - Active users
  - Suspended users
- Filter by:
  - Role (USER, ADMIN)
  - Status (Active, Suspended, Blocked)
  - Registration date

**Actions Per User**:
- View user profile
- View user transfer history
- Update user status:
  - Active: Normal operations
  - Suspended: Temporarily disabled
  - Blocked: Permanently disabled
- Change user role (USER ↔ ADMIN)
- View user statistics (total transfers, volume)

### 5. Analytics & Reports
**Location**: `/admin/analytics`

**Available Reports**:
- Transfer volume over time
- User growth metrics
- Revenue analytics
- Popular transfer corridors
- Failure rate analysis
- Processing time metrics

**Export Options**:
- CSV format
- Excel format
- Date range selection
- Custom filters

### 6. System Settings
**Location**: `/admin/settings`

**Configuration Options**:
- Exchange rate management
- Fee structure
- Transfer limits
- System notifications
- Maintenance mode
- Audit logs

## Technical Workflow

### Authentication Flow
1. User/Admin logs in
2. Backend validates credentials
3. JWT token issued
4. Token stored in local storage
5. Token included in all API requests
6. Protected routes check for valid token

### Transfer Creation Flow
```
User → Create Transfer → Upload Payment Proof → 
Admin Verification → MTN Processing → 
Recipient Receives Money → Status: COMPLETED
```

### State Management
- React Query for server state
- React Context for authentication
- Local state for forms and UI

### API Integration
- Axios for HTTP requests
- Centralized API client configuration
- Error handling and retry logic
- Request/response interceptors

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/cc3c89d7-67e9-4413-b547-31d76dc3d8fc) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/cc3c89d7-67e9-4413-b547-31d76dc3d8fc) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
