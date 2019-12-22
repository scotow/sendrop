FROM node:8-alpine

RUN apk update && apk add --no-cache python2 make g++

COPY . /app
WORKDIR /app

RUN npm install && apk del python2 make g++

CMD node app.js