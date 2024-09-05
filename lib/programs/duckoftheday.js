const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const pointsModule = require('./duckoftheday-points'); // Import the points module
const { EmbedBuilder, AttachmentBuilder } = require('discord.js'); // Updated import
const { setTimeout } = require('timers/promises'); // Might become useless for this app
const moment = require('moment-timezone');
const usedDuckImagesPath = path.join(__dirname, 'data', 'usedDuckImages.json');

// Define the days when the duck image posting is allowed
const activationDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']; // Example days

// Function to check if today is an active day
function isActiveDay() {
  const now = moment().tz('Europe/Helsinki'); // Get current time in Finland
  const currentDay = now.format('dddd'); // Get the current day of the week
  return activationDays.includes(currentDay); // Check if today is in the activationDays array
}

// Function to read used duck images
function readUsedDuckImages() {
  // Check if the file exists
  if (!fs.existsSync(usedDuckImagesPath)) {
    // If it doesn't exist, create it with an empty array
    fs.writeFileSync(usedDuckImagesPath, JSON.stringify([], null, 2));
    console.log("Created usedDuckImages.json file.");
  }

  try {
    const rawData = fs.readFileSync(usedDuckImagesPath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading used duck images:", error);
    return []; // Return an empty array if reading fails
  }
}

// Function to add a used duck image
function addUsedDuckImage(imageName) {
  const usedImages = readUsedDuckImages();

  // Check if the image has already been used
  if (!usedImages.some(item => item.image === imageName)) {
    usedImages.push({ image: imageName, date: moment().tz('Europe/Helsinki').format('YYYY-MM-DD') }); // Add new image to the array
    writeUsedDuckImages(usedImages); // Write the updated array to the file
    console.log(`Added ${imageName} to used duck images.`);
  } else {
    console.log(`${imageName} has already been used.`);
  }
}

// Function to write used duck images to the file
function writeUsedDuckImages(usedImages) {
  fs.writeFileSync(usedDuckImagesPath, JSON.stringify(usedImages, null, 2));
}


// Function to check if a duck image has been posted today
function hasPostedToday() {
  const today = moment().tz('Europe/Helsinki').format('YYYY-MM-DD'); // Get today's date in YYYY-MM-DD format

  // Read the used duck images from the file
  const usedImages = readUsedDuckImages();

  // Check if there is an entry for today
  return usedImages.some(item => item.date === today);
}

// Function to read used duck images
function readUsedDuckImages() {
  try {
    const rawData = fs.readFileSync(usedDuckImagesPath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading used duck images:", error);
    return []; // Return an empty array if reading fails
  }
}

// Function to post the duck image
async function postDuckImage(client, channel, markAsUsed = true) {
  const duckImages = getDuckImages();
  const duckImage = getRandomDuckImage(duckImages);

  // Remove the file extension and extract the date from the duck image filename (format: YYYY.MM.DD)
  const datePart = duckImage.replace(/\.[^/.]+$/, ""); // Remove the file extension
  const dateComponents = datePart.split('.'); // Split by dot

  // Ensure we have exactly 3 components (year, month, day)
  if (dateComponents.length === 3) {
    const [year, month, day] = dateComponents; // Destructure the components

    // Format the date as DD.MM.YYYY
    const formattedDate = `${day}.${month}.${year}`;

    // Update the embed title to include the formatted date
    const embed = new EmbedBuilder()
      .setTitle(`Duck of the Day: ${formattedDate}`)
      .setImage(`attachment://${duckImage}`)
      .setColor('#2b2d31'); // Color of the left edge of embed

    // Start the point system monitoring
    pointsModule.startPointSystem(channel); // Start the point system monitoring

    const attachment = new AttachmentBuilder(path.join(duckImagesDir, duckImage));

    await channel.send({ embeds: [embed], files: [attachment] });

    // Save the used image only if markAsUsed is true
    if (markAsUsed) {
      addUsedDuckImage(duckImage); // Add the used image to the list
    }
  } else {
    console.error(`Filename format is incorrect: ${duckImage}`);
    await channel.send('Error: The duck image filename format is incorrect.');
  }
}

async function checkAndPostIfSilent(client, duck_channel, postTime, checkCount = 0) {
  // Check if the channel has been silent for 15 minutes
  const silence = await checkChannelSilence(duck_channel);
  if (silence) {
    await postDuckImage(client, duck_channel);
  } else {
    // Increment the check count
    checkCount++;

    // Calculate the remaining time until the channel has been silent for 15 minutes
    const silenceTime = await getSilenceTime(duck_channel);
    const remainingTime = 15 * 60 * 1000 - silenceTime; // Remaining time in milliseconds

    console.log(`Channel is not silent. Scheduling another check in ${remainingTime / 1000} seconds...`);

    // Schedule another check after the remaining time
    schedule.scheduleJob(moment().add(remainingTime, 'milliseconds').toDate(), async () => {
      // Check if the current time is past 5 PM
      if (moment().hour() >= 17) {
        console.log("It's past 5 PM. Forcefully posting the duck image.");
        await postDuckImage(client, duck_channel);
      } else {
        // Recursively call the scheduled job with the updated check count
        await checkAndPostIfSilent(client, duck_channel, postTime, checkCount);
      }
    });

    // If the check count reaches 3, forcefully post the image
    if (checkCount >= 3) {
      console.log("Channel is not silent. Maximum checks reached. Forcefully posting the duck image.");
      await postDuckImage(client, duck_channel);
      return; // Exit the function after posting
    }
  }
}

// Function to handle bot startup
async function onBotStart(client, duck_channel) {
  const now = moment().tz('Europe/Helsinki'); // Get current time in Finland

  // Check if the duck image has been posted today
  if (!hasPostedToday()) {
    // If the current time is after 5 PM, do nothing
    if (now.hour() >= 17) {
      console.log("It's past 5 PM. Duck image will not be posted today.");
      return; // Exit the function if it's past 5 PM
    }

    // Check if today is an active day
    if (!isActiveDay()) {
      console.log("Today is not an active day for posting the duck image.");
      return; // Exit if today is not an active day
    }

    // Randomize time between current time and 5 PM
    const randomHour = Math.floor(Math.random() * (17 - now.hour() + 1)) + now.hour(); // Random hour between current hour and 5 PM
    const randomMinute = Math.floor(Math.random() * 60); // Random minute

    // Set the time for posting
    const postTime = now.clone().hour(randomHour).minute(randomMinute).second(0);

    // Log the scheduled posting time
    console.log(`Duck image will be posted at: ${postTime.format('DD-MM-YYYY HH:mm:ss')}`); // Log the selected time

    // Schedule the job for today
    schedule.scheduleJob(postTime.toDate(), async () => {
      // Check if the channel has been silent for 15 minutes
      console.log(`Checking silence for the scheduled post at: ${postTime.format('DD-MM-YYYY HH:mm:ss')}`);
      await checkAndPostIfSilent(client, duck_channel, postTime);
    });
  } else {
    // Log that the duck image has already been posted today
    console.log("Duck image will not be posted again.");
  }

  // Schedule duck image posting for every day
  scheduleDailyDuckImagePosting(client, duck_channel);
}

// Function to schedule the duck image posting for every day
function scheduleDailyDuckImagePosting(client, duck_channel) {
  if (!duck_channel || duck_channel.type !== 'GUILD_TEXT') return;

  // Schedule the job to run at 9:59 AM
  schedule.scheduleJob('59 9 * * *', async () => {
    // Check if today is an active day
    if (!isActiveDay()) {
      console.log("Today is not an active day for posting the duck image.");
      return; // Exit if today is not an active day
    }

    // Generate a random time between 10 AM and 5 PM
    const randomHour = Math.floor(Math.random() * 8) + 10; // Random hour between 10 and 17
    const randomMinute = Math.floor(Math.random() * 60); // Random minute

    // Create a date object for the scheduled time
    const now = moment().tz('Europe/Helsinki'); // Get current time in Finland
    const postTime = now.clone().hour(randomHour).minute(randomMinute).second(0);

    // Log the selected posting time
    console.log(`Duck image will be scheduled for: ${postTime.format('YYYY-MM-DD HH:mm:ss')}`);

    // Schedule the job for the random time
    schedule.scheduleJob(postTime.toDate(), async () => {
      // Check if the channel has been silent for 15 minutes
      console.log(`Checking silence for the scheduled post at: ${postTime.format('YYYY-MM-DD HH:mm:ss')}`);
      await checkAndPostIfSilent(client, duck_channel, postTime);
    });
  });
}

// Export the functions
module.exports = {
  postDuckImage,
  scheduleDailyDuckImagePosting,
  onBotStart, // Export the onBotStart function
};
