# syntax=docker/dockerfile:1
FROM node:20-alpine as builder
LABEL maintainer="seddik.bouzayani <seddik.bouzayani@esprit.tn>"

ARG BUILD_ENV
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
