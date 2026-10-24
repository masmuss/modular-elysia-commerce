FROM oven/bun:1.4.0-alpine AS dev

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "bun run db:migrate && bun run --watch src/index.ts"]
