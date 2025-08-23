# Use Node.js LTS
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Copy .env file into container
COPY .env .env

# Expose port if you run a web server
EXPOSE 3000

# Run your bot
CMD ["node", "src/run.js"]
