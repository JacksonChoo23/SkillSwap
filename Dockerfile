# Dockerfile for Cloud Run
FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package manifests and install first for better caching
COPY package*.json ./
# Use npm ci to install exact deps
RUN npm ci --omit=dev

# Copy source (including public/ and views/)
COPY . .

# Safety check (prints during build logs)
RUN if [ -d "./public" ]; then echo "public exists"; else echo "⚠️ public not found"; fi

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start the app
CMD ["node", "app.js"]
