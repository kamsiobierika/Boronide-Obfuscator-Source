# Use Node.js official image
FROM node:18

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project (including src/)
COPY . .

# Run your bot (inside src)
CMD ["node", "src/run.js"]
