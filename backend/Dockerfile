FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p uploads certificates templates logs

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "run", "dev"]
