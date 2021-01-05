FROM node:latest
RUN mkdir /usr/local/chat-assistant
WORKDIR /usr/local/chat-assistant
COPY package.json .
RUN npm i
COPY . .
CMD node run-local.js
