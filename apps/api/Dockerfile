# syntax=docker/dockerfile:1.7

FROM node:26.8.1-bookworm-slim AS dependencies
WORKDIR /workspace
# Prisma loads prisma.config.ts during image compilation. This is a non-secret
# placeholder used only by `prisma generate`; runtime services override it via
# docker-compose with the real DATABASE_URL.
ENV HUSKY=0 \
    DATABASE_URL=postgresql://orbit:orbit@localhost:5432/orbit?schema=public
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/prettier-config/package.json packages/prettier-config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm ci

FROM dependencies AS builder
COPY apps/api apps/api
COPY packages/shared packages/shared
COPY packages/tsconfig packages/tsconfig
RUN npm run prisma:generate --workspace=@orbit/api
RUN npm run build --workspace=@orbit/shared && npm run build --workspace=@orbit/api

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:26.8.1-bookworm-slim AS api
WORKDIR /workspace
ENV NODE_ENV=production \
    PORT=4000
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=production-dependencies /workspace/node_modules ./node_modules
COPY --from=builder /workspace/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=builder /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist

RUN mkdir -p /workspace/data/uploads && chown -R node:node /workspace/data
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]

FROM builder AS migration
ENV NODE_ENV=production
CMD ["npm", "run", "prisma:deploy", "--workspace=@orbit/api"]
