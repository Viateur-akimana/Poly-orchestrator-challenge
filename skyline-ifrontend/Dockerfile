FROM node:20-alpine AS builder
RUN apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# Production stage: serve with nginx
FROM nginx:1.27-alpine AS runner
RUN apk upgrade --no-cache

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
# Copy as a template so nginx's built-in envsubst replaces ${BACKEND_HOST} at startup
COPY nginx.conf /etc/nginx/templates/app.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
