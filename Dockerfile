FROM node:18.16.0
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
RUN npm run build
WORKDIR /usr/src/app/dist
CMD ["node", "app.js"]
