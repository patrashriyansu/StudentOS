# ─── Stage 1: Python backend ──────────────────────────────────────────────────
FROM python:3.12-slim AS backend

WORKDIR /app

# Install dependencies first (cached layer)
COPY backend/requirements-render.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source
COPY backend/ /app/backend/

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]


# ─── Stage 2: Node / frontend build ───────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --frozen-lockfile

COPY frontend/ .

# Build with an empty VITE_API_URL; Cloud Run injects it at runtime via env vars.
# Firebase Hosting bakes VITE_API_URL in at CI build time (see deploy.yml).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


# ─── Stage 3: Nginx — serves the built frontend & reverse-proxies to backend ──
FROM nginx:1.27-alpine AS nginx

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
