FROM node:22-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application files and pre-built frontend
COPY dist/ ./dist/
COPY server.ts ./
COPY services/ ./services/
COPY lib/ ./lib/
COPY public/ ./public/

ENV NODE_ENV=production
ENV PORT=5003
EXPOSE 5003

CMD ["npx", "tsx", "server.ts"]
