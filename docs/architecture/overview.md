# System Architecture Overview

## 🏗️ High-Level Architecture

meetCITAD v2 follows a modern **three-tier architecture** with microservices patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  User Frontend   │         │  Admin Frontend  │         │
│  │   (Vue 3 PWA)    │         │    (Vue 3 SPA)   │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            └──────────────┬───────────────┘
                           │
                    ┌──────▼──────┐
                    │    NGINX    │
                    │  (Reverse   │
                    │   Proxy)    │
                    └──────┬──────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    Backend Layer                             │
│                    ┌─────▼─────┐                            │
│                    │  Express   │                            │
│                    │    API     │                            │
│                    └─────┬─────┘                            │
│                          │                                   │
│    ┌──────────┬──────────┼──────────┬──────────┬─────────┐ │
│    │          │          │          │          │         │ │
│ ┌──▼──┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌────▼───┐  ┌─▼─┐ │
│ │Auth │  │Events│  │Users │  │Certs │  │Feedback│  │...│ │
│ │Ctrl │  │Ctrl  │  │Ctrl  │  │Ctrl  │  │Ctrl    │  │   │ │
│ └──┬──┘  └───┬──┘  └───┬──┘  └───┬──┘  └────┬───┘  └─┬─┘ │
│    │         │          │          │          │        │   │
│    └─────────┴──────────┴──────────┴──────────┴────────┘   │
│                          │                                   │
│              ┌───────────┴───────────┐                      │
│              │    Service Layer      │                      │
│    ┌─────────┼─────────┬─────────┬──┴───────┬──────────┐  │
│    │         │         │         │          │          │  │
│ ┌──▼──┐  ┌──▼──┐  ┌──▼──┐  ┌───▼───┐  ┌───▼───┐  ┌──▼─┐ │
│ │ QR  │  │Email│  │ SMS │  │ Cert  │  │Notify │  │... │ │
│ │Svc  │  │Svc  │  │ Svc │  │ Svc   │  │ Svc   │  │    │ │
│ └─────┘  └─────┘  └─────┘  └───────┘  └───────┘  └────┘ │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                   Data Layer                                 │
│    ┌───────────────┐    ┌───────────────┐    ┌──────────┐  │
│    │   MongoDB     │    │     Redis     │    │  File    │  │
│    │  (Primary DB) │    │   (Cache &    │    │ Storage  │  │
│    │               │    │    Queues)    │    │          │  │
│    └───────────────┘    └───────────────┘    └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Component Breakdown

### **1. Frontend Layer**

#### User Frontend (PWA)
- **Technology:** Vue 3 + Vite + Vuetify 3
- **State Management:** Pinia
- **Features:**
  - Event browsing and registration
  - QR ticket display
  - Profile management
  - Certificate downloads
  - Feedback submission
  - Offline support (PWA)

#### Admin Frontend (SPA)
- **Technology:** Vue 3 + Vite + Vuetify 3
- **Features:**
  - Event management dashboard
  - User management
  - QR code scanning
  - Certificate generation
  - Analytics and reports
  - Audit logs

### **2. Backend Layer**

#### API Server (Express.js)
```
backend/
├── src/
│   ├── models/           # Mongoose schemas
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, validation, etc.
│   ├── routes/           # API endpoints
│   ├── workers/          # Background jobs
│   ├── config/           # Configuration
│   └── utils/            # Helpers
```

#### Controllers
- **Auth Controller** - Authentication and authorization
- **Event Controller** - Event CRUD and management
- **User Controller** - User profile and preferences
- **Attendance Controller** - QR scanning and check-in
- **Certificate Controller** - Template and generation
- **Feedback Controller** - Submission and analytics
- **Notification Controller** - Multi-channel delivery
- **Admin Controller** - Admin operations

#### Services
- **QR Service** - QR code generation and verification
- **Certificate Service** - PDF generation with templates
- **Email Service** - Mailjet integration
- **SMS Service** - Twilio integration
- **Notification Service** - Multi-channel dispatcher
- **Storage Service** - File upload/download

#### Middleware
- **Auth Middleware** - JWT, OTP, 2FA verification
- **Rate Limiter** - Redis-based rate limiting
- **Validation** - Express-validator rules
- **Upload** - Multer + Sharp processing
- **Error Handler** - Global error handling

### **3. Data Layer**

#### MongoDB (Primary Database)
- **Models:** User, Admin, Event, Certificate, CertificateTemplate, Feedback, Notification
- **Features:**
  - Document-based storage
  - Indexes for performance
  - Virtuals and methods
  - Pre/post hooks

#### Redis (Cache & Queues)
- **Use Cases:**
  - Session storage
  - Rate limiting
  - Job queues (Bull)
  - Real-time data caching

#### File Storage
- **Types:**
  - Profile pictures
  - Event banners
  - Certificates (PDF)
  - Templates
- **Options:** Local filesystem / S3 / Cloudinary

## 🔄 Request Flow

### Typical API Request Flow:
```
1. Client → NGINX → Express App
2. Express → Middleware Chain:
   ├─ Rate Limiter (check limits)
   ├─ Auth Middleware (verify JWT)
   ├─ Validation (validate input)
   └─ Upload (process files if needed)
3. Express → Controller (handle request)
4. Controller → Service (business logic)
5. Service → Model (database operations)
6. Service → External APIs (email, SMS, etc.)
7. Model → MongoDB (CRUD operations)
8. Response ← All layers return
```

## 🔐 Security Layers

### **1. Network Security**
- NGINX SSL/TLS termination
- CORS configuration
- Rate limiting per IP/user

### **2. Authentication**
- JWT access tokens (15min expiry)
- Refresh tokens (7 days)
- OTP for admin (speakeasy)
- 2FA for users (optional)

### **3. Authorization**
- Role-based access control (RBAC)
- Permission system (11 permissions)
- Resource ownership validation

### **4. Data Security**
- Password hashing (bcrypt, 10 rounds)
- Email verification
- Input sanitization (mongo-sanitize, xss-clean)
- HMAC signatures for QR codes

## 📊 Data Flow Patterns

### **Event Registration Flow:**
```
User → Register for Event
  ↓
System checks capacity
  ↓
Create registration record
  ↓
Generate personal QR code
  ↓
Send confirmation email
  ↓
Add to gamification stats
```

### **Certificate Generation Flow:**
```
Event Completed
  ↓
Admin triggers generation
  ↓
Queue: Fetch attendees
  ↓
Queue: For each attendee:
  ├─ Load template
  ├─ Render with user data
  ├─ Generate PDF
  ├─ Generate verification hash
  ├─ Save to storage
  └─ Create certificate record
  ↓
Queue: Send email notifications
```

### **QR Check-in Flow:**
```
Admin scans QR code
  ↓
Verify signature (HMAC)
  ↓
Validate event & user
  ↓
Check duplicate attendance
  ↓
Mark as attended
  ↓
Update analytics
  ↓
Send confirmation notification
```

## 🔧 Scalability Considerations

### **Horizontal Scaling**
- Stateless API servers (JWT-based auth)
- Redis for shared session/cache
- Load balancer (NGINX)

### **Vertical Scaling**
- MongoDB indexes for query performance
- Redis caching for frequent reads
- Background jobs for heavy operations

### **Performance Optimizations**
- Image compression (Sharp)
- PDF generation in queue (Bull)
- Email/SMS in background
- Database query optimization

## 📈 Monitoring & Observability

### **Logging**
- Winston for structured logging
- File rotation (5MB, 5 files)
- Separate error logs
- Request logging (Morgan)

### **Metrics**
- Response times
- Error rates
- Queue lengths
- Cache hit rates

### **Alerts**
- Failed jobs
- High error rates
- Database connection issues
- Queue backlogs

## 🚀 Deployment Architecture

### **Development**
```
Docker Compose:
├─ MongoDB container
├─ Redis container
├─ Backend container (hot reload)
├─ Frontend-user container (Vite dev)
├─ Frontend-admin container (Vite dev)
└─ NGINX container
```

### **Production**
```
Server Infrastructure:
├─ Load Balancer (NGINX)
├─ App Servers (PM2 cluster)
├─ MongoDB Replica Set
├─ Redis Cluster
├─ CDN (Static assets)
└─ Object Storage (Files)
```

---

**Next:** [Database Schema](./database.md) | [Security Model](./security.md)
