# Use an official Node.js runtime as base image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the source code
COPY . .

# Expose a port (optional, if your bot has a web dashboard)
EXPOSE 3000

# Start the bot
CMD ["node", "run.js"]
