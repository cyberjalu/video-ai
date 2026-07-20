FROM node:20-bookworm

RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

RUN npx playwright install chromium --with-deps

COPY . .
RUN npm run build

RUN useradd -m -u 1001 clipnews && mkdir -p /app/data/jobs && chown -R clipnews:clipnews /app
USER clipnews

ENV NODE_ENV=production
ENV JOB_DATA_DIR=/app/data/jobs
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/ready || exit 1

CMD ["npm", "start"]
