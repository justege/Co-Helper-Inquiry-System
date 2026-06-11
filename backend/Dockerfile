# Use this Dockerfile when Railway Root Directory = /backend.
# Builds the Vite frontend from the GitHub repo, then runs the Express API.
# Railway injects VITE_* variables at build time (set them on the service).

FROM node:20-alpine AS frontend-build
RUN apk add --no-cache git
WORKDIR /src

ARG REPO=https://github.com/justege/Co-Helper-Inquiry-System.git
ARG BRANCH=main
RUN git clone --depth 1 --branch "${BRANCH}" "${REPO}" .

WORKDIR /src/frontend
RUN npm ci && npm run build

FROM node:20-alpine AS production
WORKDIR /app/backend

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY --from=frontend-build /src/frontend/dist /app/frontend/dist

EXPOSE 8000
CMD ["node", "src/index.js"]
