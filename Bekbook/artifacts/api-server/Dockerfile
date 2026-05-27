FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/package.json

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

EXPOSE 8007
ENV PORT=8007
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
