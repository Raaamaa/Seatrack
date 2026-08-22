# Gunakan image resmi Node.js 20 Alpine yang ringan dan stabil
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Salin package.json dan package-lock.json terlebih dahulu untuk memanfaatkan Docker layer caching
COPY package*.json ./

# Install seluruh dependencies
RUN npm install

# Salin seluruh source code backend
COPY . .

# Expose port backend
EXPOSE 3000

# Perintah default untuk menjalankan server backend
CMD ["npm", "start"]
