# Use the official Node.js image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production only dependencies
RUN npm install --omit=dev

# Copy the rest of your bot's code
COPY . ./

# Ensure the logs directory exists (ownership adjustment removed)
RUN mkdir -p /app/logs

# Switch to your non-root user
USER nobody

# Define environment variables
ENV BOT_TOKEN=
ENV DUCK_CHANNEL=
ENV DUCK_IMAGE_PATH=

# Define the logs directory as a volume
VOLUME /app/logs

# Run your application when the container launches
CMD ["node", "index.js"]