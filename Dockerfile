# Production image for Home Assistant-managed playback.
FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json eslint.config.mjs .prettierrc.json ./
COPY scripts ./scripts
COPY src ./src
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
ARG BUILD_VERSION=0.1.0-beta.1
ARG BUILD_ARCH=amd64
LABEL \
    io.hass.version="${BUILD_VERSION}" \
    io.hass.type="app" \
    io.hass.arch="aarch64|amd64" \
    org.opencontainers.image.title="Virtual Carillon" \
    org.opencontainers.image.source="https://github.com/HPaulson/virtual-carillon" \
    org.opencontainers.image.licenses="MIT"
ENV NODE_ENV=production \
    VIRTUAL_CARILLON_HOST=0.0.0.0 \
    VIRTUAL_CARILLON_PORT=9876 \
    VIRTUAL_CARILLON_DATA_DIR=/app/.data
WORKDIR /app
RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
COPY bin ./bin
COPY homeassistant ./homeassistant
COPY README.md LICENSE ./
COPY homeassistant/app/entrypoint.mjs ./bin/virtual-carillon-app-entrypoint.mjs
RUN mkdir -p /app/.data/cache
EXPOSE 9876
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:9876/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "bin/virtual-carillon-app-entrypoint.mjs"]
