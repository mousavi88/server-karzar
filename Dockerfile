# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies with legacy-peer-deps
RUN npm install --legacy-peer-deps

COPY . .

# Build client and server
RUN npm run build

# Stage 2: Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files
COPY package*.json ./

# Install production dependencies ONLY with legacy-peer-deps
RUN npm install --omit=dev --legacy-peer-deps

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
