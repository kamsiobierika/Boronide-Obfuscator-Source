# Use official Node.js LTS
FROM node:18

# Set work directory
WORKDIR /usr/src/app

# Copy package.json + lock
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of files
COPY . .

# Expose port if needed (bot usually doesn't but useful for hosting)
EXPOSE 3000

# Start bot
CMD ["npm", "start"]
