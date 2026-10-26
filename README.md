# meetCITAD v2.0

**Event Attendance and Engagement System for CITAD**

A modern, scalable platform for managing events, automating attendance with QR codes, generating certificates, and engaging participants.

meetCITAD complements [CITAD's official website](https://citad.org.ng/); it does
not replace its institutional news, publications, careers, or other services.
See [implemented changes and the event-attendance roadmap](./docs/CITAD_ALIGNMENT.md)
for factual corrections, current validation, remaining release gates, and
future proposals requiring CITAD approval.

---

## 🎯 Features

### User Features
- ✅ Account creation & authentication
- ✅ Event browsing with carousel homepage
- ✅ Event registration/unregistration
- ✅ QR code attendance scanning
- ✅ Automatic registration emails
- ✅ Event feedback submission
- ✅ Calendar integration (.ics download)
- ✅ Institutional certificate download with verification QR
- ✅ Notification center
- ✅ Profile management
- ✅ Weekly schedules, private tasks, and calendar downloads

### Admin Features
- ✅ Staff signup with OTP verification
- ✅ Event CRUD with QR code generation
- ✅ QR attendance scanning (online/offline)
- ✅ Attendance export (Excel/PDF)
- ✅ Certificate generator (template/auto)
- ✅ Pre-designed certificate image upload and adjustable text/QR overlays
- ✅ Feedback analytics
- ✅ Manual attendee addition
- ✅ Broadcast notifications
- ✅ Event analytics dashboard
- ✅ Audit logging
- ✅ Weekly planning, visibility, public-only exports, and explicitly confirmed notifications

Email/SMS delivery depends on configured providers. Local Redis/queue fallback
and successful builds do not establish production readiness.

---

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Node.js 20 LTS
- Express.js 4.18.x
- MongoDB 6.x + Mongoose 7.x
- Redis 7.x (caching & sessions)
- Bull (job queues)

**Frontend:**
- Vue 3.3+ (Composition API)
- Pinia (state management)
- Vuetify 3 (UI framework)
- Vite (build tool)

**DevOps:**
- Docker & Docker Compose
- NGINX (reverse proxy)
- GitHub Actions (CI/CD — planned, not configured)

---

## 📁 Project Structure

```
meetCITAD/
├── backend/                 # Node.js API server
├── frontend-user/           # Vue 3 user application
├── frontend-admin/          # Vue 3 admin application
├── docs/                    # Documentation
├── docker-compose.yml       # Multi-container setup
└── README.md               # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20 LTS
- pnpm 8.x
- MongoDB 6.x
- Redis 7.x
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mujerheed/meetCITAD.git
cd meetCITAD
```

2. **Setup Backend**
```bash
cd backend
pnpm install
cp .env.example .env
# Edit .env with your configurations
pnpm run dev
```

3. **Setup User Frontend**
```bash
cd frontend-user
pnpm install
pnpm run dev
```

4. **Setup Admin Frontend**
```bash
cd frontend-admin
pnpm install
pnpm run dev
```

### Docker Setup (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 📚 Documentation

- [Documentation Index](./docs/README.md)
- [CITAD Alignment, Changes, and Event-Attendance Roadmap](./docs/CITAD_ALIGNMENT.md)
- [Security Baseline](./docs/SECURITY.md)
- [Non-Functional Requirements — Proposed Targets](./docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Architecture Overview](./docs/architecture/README.md)
- [Weekly Programs](./docs/WEEKLY_PROGRAMS.md)
- [API Documentation](./docs/api/README.md) (Swagger UI: http://localhost:3000/api-docs)
- [Database Schema](./docs/database/README.md)
- [Developer Guide](./docs/development/README.md)
- [Deployment Guide](./docs/deployment/README.md)
- [User Manual](./docs/user-guide/README.md)
- [Admin Manual](./docs/admin-guide/README.md)

---

## 🔐 Security

- JWT authentication with refresh tokens
- OTP verification for admins
- Rate limiting on all endpoints
- Input validation & sanitization
- CSRF protection
- XSS prevention
- SQL injection protection
- Encrypted passwords (bcrypt)
- Secure session management

---

## 📊 Database Schema

### Collections
- **users** - User accounts and profiles
- **admins** - Admin accounts with roles
- **events** - Event information and metadata
- **certificates** - Generated certificates
- **feedback** - Event feedback and ratings
- **notifications** - User notifications
- **certificate_templates** - Certificate templates

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pnpm test                # Unit tests
pnpm test:integration    # Integration tests
pnpm test:coverage       # Coverage report

# Frontend tests
cd frontend-user
pnpm test:unit          # Unit tests
pnpm test:e2e           # E2E tests
```

---

## 📦 Deployment

### Production Build

```bash
# Backend
cd backend
pnpm run build
pnpm start

# Frontend User
cd frontend-user
pnpm run build

# Frontend Admin
cd frontend-admin
pnpm run build
```

### Environment Variables

See `.env.example` files in each directory for required environment variables.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 👥 Team

- **Developer:** Abdurrazaq Jibril Baba
- **Organization:** CITAD, Kano

---

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/mujerheed/meetCITAD/issues)
- CITAD general contact: [info@citad.org](mailto:info@citad.org)
- Official contact information: [citad.org.ng/contact/](https://citad.org.ng/contact/)
- Dedicated meetCITAD support ownership requires CITAD confirmation.

---

## 🗓️ Changelog

### October 2026 — Local v2 updates, pending release approval
- Weekly scheduling reuses existing event registration, attendance, and certificate workflows.
- Hardened authentication, permissions, QR validation, and certificate access.
- Institutional certificates and approved pre-designed image templates.
- Corrected official CITAD details; removed unsupported public impact figures.
- Documented source caveats and an event-attendance-only future roadmap.
- See [current checks and release prerequisites](./docs/CITAD_ALIGNMENT.md#7-validation-and-release-status).

### Version 2.0.0 (December 2025)
- Complete rebuild with Vue 3 and modern stack
- QR code attendance system
- Certificate generation and verification
- Enhanced authentication with OTP
- Real-time notifications
- Offline support for attendance
- Comprehensive analytics dashboard
- And much more...

### Version 1.0.0 (Previous)
- Basic event management
- User registration
- Manual attendance tracking

---

**Built with ❤️ by CITAD**
