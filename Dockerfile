FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package definition
COPY package*.json ./

# Install ONLY production dependencies (ws)
RUN npm install --omit=dev

# Copy the server source code
COPY server.js ./

# Expose server port
EXPOSE 3000

# Start production server
CMD ["node", "server.js"]
