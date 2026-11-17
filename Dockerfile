FROM node:22-alpine
WORKDIR /app

# install dependencies first (Docker reuses this layer if they don't change)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public ./public

ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["node", "server.js"]