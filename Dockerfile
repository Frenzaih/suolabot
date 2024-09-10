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

# Define environment variables
ENV NODE_ENV=production
ENV BOT_TOKEN=
ENV DUCK_CHANNEL=
# client id = application id in discord dev portal
ENV CLIENT_ID=  
ENV GUILD_ID=

# Define the logs directory as a volume
VOLUME /app/logs

# Run your application when the container launches
CMD ["node", "index.js"]