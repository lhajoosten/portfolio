FROM node:22-alpine

WORKDIR /app

# Enable corepack for pnpm (no global npm install needed)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies first — this layer is cached unless package.json changes
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy application source
COPY . .

EXPOSE 3000

# Default: start Vite dev server with hot-reload (dev).
# Production docker-compose overrides this CMD with: pnpm build && pnpm preview --host
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
