FROM oven/bun:1 AS dev

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "bun run db:migrate && bun run --watch src/index.ts"]
