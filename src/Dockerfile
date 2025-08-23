# Use Node.js LTS
FROM node:18-slim

# Install Lua 5.1 (needed for your obfuscator scripts)
RUN apt-get update && apt-get install -y lua5.1 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy the rest of your bot files
COPY . .

# Expose port (not always needed for Discord bots, but some hosts require it)
EXPOSE 3000

# Run your bot
CMD ["node", "run.js"]
