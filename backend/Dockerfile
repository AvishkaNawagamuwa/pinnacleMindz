FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src/

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY src/assets ./src/assets

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
