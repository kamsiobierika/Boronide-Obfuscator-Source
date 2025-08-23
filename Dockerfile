# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port if needed (e.g., Express)
EXPOSE 10000

# Start command
CMD ["node", "src/run.js"]
