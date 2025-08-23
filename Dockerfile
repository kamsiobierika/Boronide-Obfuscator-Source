# Use Node.js LTS image
FROM node:18

# Create app directory
WORKDIR /
# Copy only package.json & package-lock.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the code
COPY . .

# Expose port (if your app uses Express for web UI/API)
EXPOSE 3000

# Run your app
CMD ["npm", "start"]
