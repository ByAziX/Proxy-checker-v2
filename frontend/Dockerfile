# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances, forçant la recompilation des binaires natifs
RUN npm install --force

# Copier le reste des fichiers
COPY . .

# Forcer la recompilation de lightningcss pour Linux
RUN npm rebuild lightningcss

# Build Next.js
RUN npm run build

# Stage 2: Production
FROM node:20

WORKDIR /app

# Copier le build et node_modules depuis le builder
COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "start"]
