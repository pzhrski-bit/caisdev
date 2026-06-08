FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js .
COPY hrm_review.html .
COPY db ./db
COPY middleware ./middleware
COPY routes ./routes
EXPOSE 3000
CMD ["node", "server.js"]
