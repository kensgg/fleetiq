# ==============================================================
# FleetIQ — Dockerfile (Multi-stage, Next.js Standalone)
# ==============================================================
# Stage 1 ▸ Install dependencies (cached layer)
# Stage 2 ▸ Build the application (inlines NEXT_PUBLIC_* env vars)
# Stage 3 ▸ Production runner (minimal, non-root)
# ==============================================================

# ── Stage 1: Install deps ──────────────────────────────────────
FROM node:22-alpine AS deps

# libc6-compat fixes compatibility issues with some npm packages on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy manifests only — leverages Docker layer cache
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* variables are inlined at build time by the Next.js compiler.
# They MUST be passed as Docker build ARGs (--build-arg or compose args: section).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Disable Next.js telemetry inside CI/Docker builds
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone output — includes only the files needed to run
# the server without a full node_modules installation.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs

# Listen on all interfaces inside the container (Nginx sits in front)
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

# next.config.ts sets output:"standalone" → entry point is server.js
CMD ["node", "server.js"]
