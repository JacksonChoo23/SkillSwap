# Use official Node.js image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the application (including static files)
COPY . .

# Make sure static resources exist
RUN ls -la public || echo "⚠️ Warning: public/ not found!"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Start the app
CMD ["node", "app.js"]
