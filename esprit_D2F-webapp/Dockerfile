# syntax=docker/dockerfile:1
FROM node:18.16.0-bullseye as builder
LABEL maintainer="seddik.bouzayani <seddik.bouzayani@esprit.tn>"

ARG BUILD_ENV
WORKDIR /usr/app

COPY package.json package-lock.json ./
ENV NODE_ENV production

RUN --mount=type=cache,target=/usr/app/.npm \
    npm set cache /usr/app/.npm && \
    npm install --legacy-peer-deps

COPY . .
RUN npm run build:$BUILD_ENV

FROM nginx:1.24.0-alpine as runtime
LABEL maintainer="seddik.bouzayani <seddik.bouzayani@esprit.tn>"

RUN apk add --no-cache tzdata

WORKDIR /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -rf ./*

# ✅ Copy everything from build (includes /assets/img/logo/esprit.png)
COPY --from=builder /usr/app/dist ./

ENTRYPOINT ["nginx", "-g", "daemon off;"]
