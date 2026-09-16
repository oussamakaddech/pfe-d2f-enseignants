# syntax=docker/dockerfile:1
FROM node:20-alpine as builder
LABEL maintainer="seddik.bouzayani <seddik.bouzayani@esprit.tn>"

ARG BUILD_ENV
ARG VITE_API_URL
ARG VITE_NOTIFICATION_URL
ARG VITE_NOTIFICATIONS_WS_URL

# ── Propagation des ARG vers l'environnement de build ────────────────────────
# Vite lit import.meta.env.VITE_* depuis les variables d'env du process, PAS
# depuis les ARG Docker. Sans ces ENV, `vite build` (MODE=production) échoue
# car env.ts fait `throw` si VITE_API_URL est absent. BUILD_ENV doit aussi être
# exporté sinon `npm run build:$BUILD_ENV` retombe toujours sur le build dev.
ENV BUILD_ENV=${BUILD_ENV}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_NOTIFICATION_URL=${VITE_NOTIFICATION_URL}
ENV VITE_NOTIFICATIONS_WS_URL=${VITE_NOTIFICATIONS_WS_URL}

WORKDIR /usr/app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/usr/app/.npm \
    npm set cache /usr/app/.npm && \
    npm install --legacy-peer-deps

COPY . .
RUN if [ -n "$BUILD_ENV" ]; then npm run build:$BUILD_ENV; else npm run build; fi

FROM nginx:1.24.0-alpine as runtime
LABEL maintainer="seddik.bouzayani <seddik.bouzayani@esprit.tn>"

RUN apk add --no-cache tzdata

WORKDIR /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf ./*

# ✅ Copy everything from build (includes /assets/img/logo/esprit.png)
COPY --from=builder /usr/app/dist ./

# Sécurité : exécuter nginx en tant qu'utilisateur non-root (conformité DSI §6)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid
USER nginx

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:80/ || exit 1

ENTRYPOINT ["nginx", "-g", "daemon off;"]
