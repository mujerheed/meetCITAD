# meetCITAD Backend - Quick Start (No Docker)

## Option 1: Install Dependencies with npm (Simpler)

Since pnpm might have issues, let's use npm which is already installed:

```bash
# Make sure you're in the backend directory
cd /home/secure/Desktop/Mujerheed/Software/meetCITAD/meetCITAD/backend

# Install dependencies with npm instead
npm install

# This will take a few minutes...
```

## Option 2: Install MongoDB and Redis (Required for Full Testing)

### Install MongoDB

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list
sudo apt update

# Install MongoDB
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

## Quick Test Without Database (Temporary)

If you want to test immediately without installing MongoDB/Redis, I can create a mock version:

```bash
# Install dependencies
npm install

# Create a minimal .env
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
JWT_SECRET=test_jwt_secret_minimum_32_characters_long_for_testing_only
JWT_REFRESH_SECRET=test_refresh_secret_minimum_32_characters_long_for_testing
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
LOG_LEVEL=debug
EOF

# We'll need to modify the app to skip database connections temporarily
```

## What Would You Like To Do?

**Option A:** Install MongoDB and Redis (recommended for full testing)
- Run the commands above

**Option B:** Use npm instead of pnpm
- Just run: `npm install`

**Option C:** I'll create a test mode that doesn't require databases
- I'll modify the code to run without MongoDB/Redis temporarily

**Which option do you prefer?**
