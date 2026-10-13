# ---------- مرحلهٔ بیلد: ساخت وب‌اپ کلاینت ----------
FROM hub.hamdocker.ir/node:20 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
RUN npm ci && npm --prefix client ci

COPY . .
# بدون VITE_API_URL بیلد می‌شود تا کلاینت وب از همان دامنهٔ خودش API را صدا بزند
RUN npm --prefix client run build

# ---------- مرحلهٔ اجرا: فقط سرور + خروجی بیلد ----------
FROM hub.hamdocker.ir/node:20 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY shared ./shared
COPY publish ./publish
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001
CMD ["node", "server/index.js"]
