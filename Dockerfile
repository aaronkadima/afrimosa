FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json server.js ./
COPY index.html ./
COPY admin ./admin
COPY assets ./assets
COPY data ./data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
