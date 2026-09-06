# Railway deployment — Dockerfile (not nixpacks) so Chromium's shared
# libraries are deterministic. Allocate >= 1 GB RAM to the service.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# postinstall runs `prisma generate`, which needs the schema present
RUN npm ci

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Chromium + system deps baked into the image at build time so the binary is
# present at the expected path in the runtime container.
COPY package.json package-lock.json ./
RUN npx --yes playwright@1.63.0 install --with-deps chromium \
  && rm -rf /root/.npm

# Standalone server output plus static assets
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Prisma CLI + schema for `prisma migrate deploy` on release
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./

# Never run Chromium as root — root disables its sandbox.
RUN groupadd --system app && useradd --system --gid app --create-home app \
  && chown -R app:app /app /ms-playwright
USER app

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
