# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install dependencies
RUN npm install

COPY . .

# Environment variable for API URL (used by Vite at build time)
# Backend is exposed at port 9002 on localhost
ARG VITE_GO_URL=http://localhost:9002/v1
ENV VITE_GO_URL=${VITE_GO_URL}

RUN npm run build

# Production Runner Stage
# We use a simple static file server instead of Nginx
FROM node:20-alpine

WORKDIR /app

# Install 'serve' globally
RUN npm install -g serve

# Copy built assets
COPY --from=builder /app/dist ./dist

# Expose port 9001
EXPOSE 9001

# Serve the 'dist' folder on port 9001
CMD ["serve", "-s", "dist", "-l", "9001"]
