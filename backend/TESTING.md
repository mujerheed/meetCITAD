# meetCITAD Backend Testing Guide

## 🧪 Testing the Foundation

### Prerequisites Check

Before testing, ensure you have:
- ✅ Node.js 20 LTS installed
- ✅ pnpm installed
- ✅ MongoDB running (local or Docker)
- ✅ Redis running (local or Docker)

### Quick Setup

#### 1. Install Dependencies

```bash
cd /home/secure/Desktop/Mujerheed/Software/meetCITAD/meetCITAD/backend
pnpm install
```

#### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your credentials
nano .env  # or use your preferred editor
```

**Minimum required variables:**
```env
NODE_ENV=development
PORT=3000

# MongoDB (adjust if needed)
MONGODB_URI=mongodb://localhost:27017/meetcitad

# Redis (adjust if needed)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets (generate secure keys)
JWT_SECRET=your_very_secure_jwt_secret_minimum_32_characters_long_change_this
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_minimum_32_characters_long_change_this

# Email (optional for now, can be empty)
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
EMAIL_FROM=noreply@citad.org

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

#### 3. Start MongoDB and Redis

**Option A: Using Docker Compose (Easiest)**
```bash
# From project root
cd /home/secure/Desktop/Mujerheed/Software/meetCITAD/meetCITAD
docker-compose up -d mongodb redis
```

**Option B: Using System Services**
```bash
# MongoDB
sudo systemctl start mongod

# Redis
sudo systemctl start redis
```

**Option C: Check if already running**
```bash
# Check MongoDB
mongosh --eval "db.version()"

# Check Redis
redis-cli ping
```

#### 4. Start the Backend Server

```bash
cd backend
pnpm run dev
```

### 🎯 Expected Output

If everything is working, you should see:

```
[timestamp] [info]: MongoDB Connected: localhost
[timestamp] [info]: Redis Client Connected
[timestamp] [info]: Redis Client Ready
[timestamp] [info]: 🚀 Server running in development mode on port 3000
[timestamp] [info]: 📡 API: http://localhost:3000/api/v1
[timestamp] [info]: 📚 Documentation: http://localhost:3000/api-docs
```

### ✅ Testing Endpoints

#### 1. Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2025-12-02T...",
  "environment": "development"
}
```

#### 2. API Info
```bash
curl http://localhost:3000/api
```

**Expected Response:**
```json
{
  "name": "meetCITAD API",
  "version": "v1",
  "description": "Event Attendance and Engagement System",
  "documentation": "/api-docs"
}
```

#### 3. Test Route
```bash
curl http://localhost:3000/api/v1/test
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "API routes are working!",
  "timestamp": "2025-12-02T..."
}
```

#### 4. Test 404 Handler
```bash
curl http://localhost:3000/api/v1/nonexistent
```

**Expected Response (404):**
```json
{
  "status": "fail",
  "message": "Route /api/v1/nonexistent not found"
}
```

### 🔍 Troubleshooting

#### Error: Cannot connect to MongoDB

**Solution:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Or start it
sudo systemctl start mongod

# Or use Docker
docker-compose up -d mongodb
```

#### Error: Redis connection failed

**Solution:**
```bash
# Check if Redis is running
sudo systemctl status redis

# Or start it
sudo systemctl start redis

# Or use Docker
docker-compose up -d redis
```

#### Error: pnpm not found

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

#### Error: Node version mismatch

**Solution:**
```bash
# Check Node version
node --version  # Should be v20.x.x

# If wrong version, install Node 20
# Using nvm (recommended)
nvm install 20
nvm use 20
```

#### Error: Port 3000 already in use

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### 📊 What to Check

After successful startup:

1. **Console Logs** - Should show:
   - ✅ MongoDB Connected
   - ✅ Redis Connected
   - ✅ Server running on port 3000

2. **Files Created:**
   - ✅ `logs/` directory with log files
   - ✅ `uploads/`, `certificates/`, `templates/` directories

3. **Database:**
   ```bash
   # Connect to MongoDB
   mongosh
   
   # Switch to meetcitad database
   use meetcitad
   
   # Show collections (should be empty for now)
   show collections
   ```

4. **Redis:**
   ```bash
   # Connect to Redis
   redis-cli
   
   # Test connection
   PING  # Should return PONG
   ```

### 🎉 Success Checklist

- [ ] Dependencies installed without errors
- [ ] MongoDB connected successfully
- [ ] Redis connected successfully
- [ ] Server started on port 3000
- [ ] Health endpoint returns 200
- [ ] API info endpoint returns correct data
- [ ] Test route works
- [ ] 404 handler works for unknown routes
- [ ] Logs are being written to files
- [ ] No error messages in console

### 📝 Next Steps

Once testing is successful:

1. **Report Results** - Tell me if everything works or if you encountered errors
2. **Continue Building** - I'll create all MongoDB schemas
3. **Add Authentication** - Build the auth system
4. **Implement Features** - Add QR codes, certificates, etc.

### 🐛 If You Encounter Issues

Share with me:
1. Error messages from console
2. Log file contents (`backend/logs/error.log`)
3. Which step failed
4. Environment details (OS, Node version, etc.)

---

**Ready to test? Follow the steps above and let me know the results!** 🚀
