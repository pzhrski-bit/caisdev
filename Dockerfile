FROM node:22-alpine
WORKDIR /app
COPY package.json .
COPY server.js .
COPY hrm_review.html .
EXPOSE 3000
CMD ["node", "server.js"]
