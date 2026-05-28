FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install ALL dependencies (including drizzle-kit for schema push)
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8007
ENV PORT=8007

# On startup: start server directly (migrations are handled via raw SQL scripts)
CMD sh -c "cd /app && exec node --enable-source-maps artifacts/api-server/dist/index.mjs"
