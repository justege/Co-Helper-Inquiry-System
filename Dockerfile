# Railway Root Directory MUST be empty (repo root), NOT /backend.
# If Root Directory is /backend, Railway uses backend/Dockerfile instead.
# Set VITE_* (and other build vars) on the Railway service — injected at build time.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN npm run install:all

COPY backend ./backend
COPY frontend ./frontend

RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend/package.json /app/backend/package-lock.json ./backend/
RUN npm ci --prefix backend --omit=dev

COPY --from=build /app/backend/src ./backend/src
COPY --from=build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 8000
CMD ["node", "src/index.js"]
