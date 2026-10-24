# Private-beta sample only: use with a TLS gateway + authenticated ingress and persistent volume.
FROM node:22.16.0-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
RUN useradd -u 10001 --create-home --shell /usr/sbin/nologin forge && mkdir -p /app/data && chown -R forge:forge /app
USER forge
ENV PORT=5200 FORGE_BIND_HOST=0.0.0.0 FORGE_ALLOW_REMOTE=YES FORGE_DB_PATH=/app/data/forge.sqlite NODE_ENV=production
EXPOSE 5200
VOLUME ["/app/data"]
# FORGE_PUBLIC_ORIGIN must be set to the private HTTPS origin at runtime.
CMD ["node","src/server.mjs"]
