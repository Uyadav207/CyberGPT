FROM oven/bun:latest
RUN apt-get update && apt-get install -y docker.io
WORKDIR /app/backend
COPY ./backend/package.json ./backend/bun.lockb ./
RUN bun install --force
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "bun run start:prod"]
