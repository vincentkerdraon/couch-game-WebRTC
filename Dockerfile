# Dockerfile for Angular SSR app
# /!\ must allow a deploy with base-href=couch-web-rtc/
# docker build --build-arg BASE_HREF=/couch-web-rtc/  .
## also must run with BASE_HREF
#  docker run --restart always -d  \
#     -p 8020:4000 \
#     -e "BASE_HREF=/couch-web-rtc/" \
#     --name couch-web-rtc-ssr \
#     ghcr.io/vincentkerdraon/couch-web-rtc-ssr:latest

FROM node:22-alpine AS build
WORKDIR /usr/src/app
ARG BASE_HREF=/
ENV BASE_HREF=${BASE_HREF}
RUN npm install -g @angular/cli
COPY package*.json ./
COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src
RUN npm install && ng build --configuration production --base-href $BASE_HREF

FROM node:22-alpine
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist/couch-game-web-rtc/ .
COPY package*.json ./
RUN npm install --omit=dev
EXPOSE 4000
CMD ["node", "server/server.mjs"]
