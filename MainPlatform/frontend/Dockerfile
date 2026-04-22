FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# The map directive must live at http{} level. Copy the robots-map snippet as
# 00-robots-map.conf so nginx loads it BEFORE default.conf (alphabetical order).
COPY nginx.robots-map.conf /etc/nginx/conf.d/00-robots-map.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
