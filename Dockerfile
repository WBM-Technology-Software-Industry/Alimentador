FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_DEVICE_ID
ENV VITE_DEVICE_ID=$VITE_DEVICE_ID
RUN npm run build
EXPOSE 3000
CMD ["node", "server.js"]
