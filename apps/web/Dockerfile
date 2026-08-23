# syntax=docker/dockerfile:1.7

FROM node:22.22.0-bookworm-slim AS builder
WORKDIR /workspace
ENV HUSKY=0

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/prettier-config/package.json packages/prettier-config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm ci

COPY apps/web apps/web
COPY packages/shared packages/shared
COPY packages/tsconfig packages/tsconfig

ARG VITE_API_URL=/api/v1
ARG VITE_APP_NAME=Orbit
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_APP_NAME=${VITE_APP_NAME}
RUN npm run build --workspace=@orbit/shared && npm run build --workspace=@orbit/web

FROM nginxinc/nginx-unprivileged:1.31.4-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
