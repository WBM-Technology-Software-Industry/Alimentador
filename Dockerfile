FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_MQTT_BROKER_URL
ARG VITE_DEVICE_ID
ENV VITE_MQTT_BROKER_URL=$VITE_MQTT_BROKER_URL
ENV VITE_DEVICE_ID=$VITE_DEVICE_ID
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
