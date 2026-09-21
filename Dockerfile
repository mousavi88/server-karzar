# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy source code
COPY . .

# Build client and server
RUN npm run build

# Stage 2: Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev || npm install --production

# Copy built application output from builder stage
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 3000

# Start production server
CMD ["npm", "start"]
