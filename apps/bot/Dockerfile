FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages ../packages

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Expose port (not needed for bot, but kept for consistency)
EXPOSE 3001

# Start bot
CMD ["pnpm", "dev"]

