# Use this Dockerfile when Railway Root Directory = /backend.
# Context is the backend folder only, so the Vite app is cloned from GitHub, then Express runs.
# Set VITE_* on the Railway service — they are available during `npm run build`.

FROM node:20-alpine AS frontend-build
RUN apk add --no-cache git
WORKDIR /src

ARG REPO=https://github.com/justege/Co-Helper-Inquiry-System.git
ARG BRANCH=main
RUN git clone --depth 1 --branch "${BRANCH}" "${REPO}" .

WORKDIR /src/frontend
RUN npm ci && npm run build

FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat
WORKDIR /app/backend
ENV NODE_ENV=production
ENV BUILD_STAMP=20260920-health-boot

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY --from=frontend-build /src/frontend/dist /app/frontend/dist

EXPOSE 8000
CMD ["node", "src/boot.js"]
