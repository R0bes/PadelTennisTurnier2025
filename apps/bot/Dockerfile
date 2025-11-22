# Multi-stage build for Bot
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Install dependencies stage
FROM base AS deps
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/bot/package.json ./apps/bot/
COPY apps/bot/tsconfig.json ./apps/bot/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules

# Copy source code
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/bot ./apps/bot

# Build TypeScript
WORKDIR /app/apps/bot
RUN pnpm build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy workspace files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy packages
COPY --from=builder /app/packages ./packages

# Copy built application
COPY --from=builder /app/apps/bot/dist ./apps/bot/dist
COPY --from=builder /app/apps/bot/package.json ./apps/bot/package.json
COPY --from=builder /app/apps/bot/admins.json ./apps/bot/admins.json

# Copy node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/bot/node_modules ./apps/bot/node_modules

# Expose port (not needed for bot, but kept for consistency)
EXPOSE 3001

# Start bot
WORKDIR /app/apps/bot
CMD ["node", "dist/bot.js"]
