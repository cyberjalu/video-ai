FROM node:20-bookworm

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

RUN npx playwright install chromium --with-deps

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV JOB_DATA_DIR=/app/data/jobs
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
