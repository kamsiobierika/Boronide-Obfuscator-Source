# Use Node.js LTS
FROM node:18

# Set working directory to root inside container
WORKDIR /

# Copy package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the project
COPY . .

# Run your app
CMD ["node", "src/run.js"]
