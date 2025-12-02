# meetCITAD v2 Documentation

Welcome to the meetCITAD v2 documentation. This folder contains comprehensive documentation for the entire system.

## 📁 Documentation Structure

```
docs/
├── api/                    # API Documentation
│   ├── authentication.md   # Auth endpoints
│   ├── events.md          # Event management
│   ├── users.md           # User management
│   ├── certificates.md    # Certificate system
│   ├── feedback.md        # Feedback system
│   └── admin.md           # Admin operations
│
├── architecture/          # System Architecture
│   ├── overview.md        # System overview
│   ├── database.md        # Database schema
│   ├── security.md        # Security model
│   └── services.md        # Service layer
│
├── guides/                # Developer Guides
│   ├── getting-started.md # Quick start guide
│   ├── development.md     # Development workflow
│   ├── testing.md         # Testing guide
│   └── contributing.md    # Contribution guidelines
│
└── deployment/            # Deployment Documentation
    ├── docker.md          # Docker deployment
    ├── production.md      # Production setup
    └── monitoring.md      # Monitoring & logging
```

## 📚 Quick Links

### For Developers
- [Getting Started](./guides/getting-started.md)
- [Development Guide](./guides/development.md)
- [System Architecture](./architecture/overview.md)

### For API Integration
- [Authentication API](./api/authentication.md)
- [Events API](./api/events.md)
- [Users API](./api/users.md)

### For DevOps
- [Docker Deployment](./deployment/docker.md)
- [Production Setup](./deployment/production.md)
- [Monitoring](./deployment/monitoring.md)

## 🎯 Project Overview

**meetCITAD** is a comprehensive event attendance and engagement system built for CITAD (Centre for Information Technology and Development) in Kano, Nigeria.

### Key Features
- ✅ Event Management with QR Code Check-in
- ✅ Digital Certificate Generation
- ✅ Multi-channel Notifications (In-app, Email, SMS, Push)
- ✅ Feedback & Analytics System
- ✅ Gamification (Points, Badges, Leaderboards)
- ✅ Admin Dashboard with RBAC
- ✅ OTP-based Admin Authentication
- ✅ PWA Support for Mobile

### Technology Stack

**Backend:**
- Node.js 20 LTS
- Express.js 4.18
- MongoDB 6.x with Mongoose
- Redis 7.x for caching
- Bull for job queues

**Frontend:**
- Vue 3.3+ with Composition API
- Pinia for state management
- Vuetify 3 for UI components
- Vite for build tooling

**DevOps:**
- Docker & Docker Compose
- NGINX reverse proxy
- Winston for logging
- Sentry for monitoring

## 📖 Documentation Index

### API Documentation
1. **Authentication** - User/Admin login, OTP, 2FA, password reset
2. **Events** - CRUD operations, registration, QR codes
3. **Users** - Profile management, preferences, gamification
4. **Certificates** - Template management, generation, verification
5. **Feedback** - Submission, analytics, NPS scores
6. **Admin** - User management, analytics, audit logs

### Architecture Documentation
1. **System Overview** - High-level architecture
2. **Database Schema** - MongoDB models and relationships
3. **Security Model** - Authentication, authorization, data protection
4. **Service Layer** - QR, certificates, email, SMS, notifications

### Developer Guides
1. **Getting Started** - Setup and installation
2. **Development Workflow** - Coding standards, git workflow
3. **Testing Guide** - Unit, integration, E2E testing
4. **Contributing** - How to contribute to the project

### Deployment Documentation
1. **Docker Deployment** - Container orchestration
2. **Production Setup** - Environment configuration
3. **Monitoring & Logging** - Observability setup

## 🔗 Additional Resources

- [Main README](../README.md)
- [Implementation Guide](../IMPLEMENTATION_GUIDE.md)
- [Testing Results](../TESTING_RESULTS.md)
- [Backend Quick Start](../backend/QUICK_START.md)

## 📝 Version History

- **v2.0.0** (December 2025) - Complete rewrite with enhanced features
- **v1.0.0** (2024) - Initial release

## 🤝 Support

For questions or issues:
- Email: support@citad.org
- GitHub Issues: [meetCITAD Repository]

---

**Last Updated:** December 2, 2025
