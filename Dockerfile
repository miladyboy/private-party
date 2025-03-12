# Use Node.js 16 LTS as base image
FROM node:16-alpine

# Create app directory
WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY src/backend/package*.json ./src/backend/

# Install dependencies
RUN npm run backend:install

# Copy app source code
COPY . .

# Expose port
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Run the app
CMD ["npm", "run", "backend:start"] 