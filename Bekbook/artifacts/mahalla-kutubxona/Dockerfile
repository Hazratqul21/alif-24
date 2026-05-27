FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY lib ./lib
COPY artifacts/mahalla-kutubxona ./artifacts/mahalla-kutubxona

# Install dependencies and build
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/mahalla-kutubxona run build

FROM nginx:alpine
COPY --from=builder /app/artifacts/mahalla-kutubxona/dist/public /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
