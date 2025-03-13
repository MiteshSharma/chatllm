# Use the official Node.js 20 Alpine image as a base
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Build the TypeScript code (if using TypeScript)
RUN npm run build

# Expose the application port (change if necessary)
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/server.js"]  # Adjust the path if your entry point is different