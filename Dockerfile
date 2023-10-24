# Build stage
FROM node:18-slim
WORKDIR /usr/src/app
COPY . .
RUN npm ci && npm run build && npm prune --production
EXPOSE 3000
ENV HOST=0.0.0.0
CMD ["node", "build/index.js"]