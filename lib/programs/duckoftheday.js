const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const pointsModule = require('./duckoftheday-points'); // Import the points module
const { EmbedBuilder, AttachmentBuilder } = require('discord.js'); // Updated import
const moment = require('moment-timezone');

// Path to the duck images
const duckImagesDir = './data/duck-images';
const usedImagesPath = './data/usedDuckImages.json';

// Specify active days
const activationDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Load used images or initialize if not present
let usedImages = [];
if (fs.existsSync(usedImagesPath)) {
  usedImages = JSON.parse(fs.readFileSync(usedImagesPath));
}

// Function to get all duck images
function getDuckImages() {
  return fs.readdirSync(duckImagesDir).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
}

// Function to reset used images
function resetUsedImages() {
  usedImages = [];
  fs.writeFileSync(usedImagesPath, JSON.stringify(usedImages));
}

// Function to get a random duck image
function getRandomDuckImage(images) {
  if (images.length === 0) {
    resetUsedImages();
    return getRandomDuckImage(getDuckImages());
  }
  const randomIndex = Math.floor(Math.random() * images.length);
  return images.splice(randomIndex, 1)[0]; // Remove the image from the array
}

// Function to check if today is an active day
function isActiveDay() {
  const now = moment().tz('Europe/Helsinki'); // Get current time in Finland
  const currentDay = now.format('dddd'); // Get the current day of the week
  return activationDays.includes(currentDay); // Check if today is in the activationDays array
}

// Function to check if the duck image has been posted today
const hasPostedToday = () => {
  const today = moment().tz('Europe/Helsinki').format('YYYY-MM-DD'); // Get current date in YYYY-MM-DD format
  const posted = usedImages.some(image => image.date === today); // Check if the image has been posted today

  // Log the result
  if (posted) {
    console.log("The duck image has already been posted today.");
  } else {
    console.log("The duck image has not been posted today.");
  }

  return posted; // Return the result of the check
};

// Function to post duck image
async function postDuckImage(client, channel, markAsUsed = true) {
  // Check if the channel is provided
  if (!channel) {
    console.error('Channel not provided.');
    return;
  }

  // Get all duck images
  const duckImages = getDuckImages();

  // Check if there are any duck images available
  if (duckImages.length === 0) {
    console.error('No duck images available to post.');
    return;
  }

  // Get a random duck image
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

    const attachment = new AttachmentBuilder(path.join(duckImagesDir, duckImage));

    try {
      await channel.send({ embeds: [embed], files: [attachment] });
    } catch (error) {
      console.error('Error sending message:', error);
      await channel.send('Error: Unable to post the duck image.');
      return;
    }

    // Save the used image only if markAsUsed is true
    if (markAsUsed) {
      usedImages.push({ image: duckImage, date: moment().tz('Europe/Helsinki').format('YYYY-MM-DD') }); // Store the image and date
      fs.writeFileSync(usedImagesPath, JSON.stringify(usedImages));

      // Start the point system monitoring
      pointsModule.startPointSystem(channel); // Start the point system monitoring
    }
  } else {
    console.error(`Filename format is incorrect: ${duckImage}`);
    await channel.send('Error: The duck image filename format is incorrect.');
  }
}

// Function to check if the channel has been silent for 5 minutes
async function checkChannelSilence(duck_channel) {
  try {
    // Fetch the last message in the channel
    const messages = await duck_channel.messages.fetch({ limit: 1 });
    const lastMessage = messages.last(); // Get the last message

    if (lastMessage) {
      const now = moment().tz('Europe/Helsinki'); // Get current time in Finland
      const silenceDuration = now.diff(lastMessage.createdTimestamp);
      return silenceDuration >= 5 * 60 * 1000; // 5 minutes in milliseconds
    }
    
    return true; // If no messages, consider it silent
  } catch (error) {
    console.error('Error fetching messages:', error);
    return false; // Consider it not silent if there was an error
  }
}

// Function to get the silence time in minutes
async function getSilenceTime(channel) {
  if (!channel) {
    console.error('Invalid channel provided.');
    return null; // Return null if the channel is invalid
  }

  try {
    const messages = await channel.messages.fetch({ limit: 1 });
    const lastMessage = messages.last();

    if (lastMessage) {
      const now = moment().tz('Europe/Helsinki');
      const silenceDuration = now.diff(lastMessage.createdTimestamp);
      return Math.floor(silenceDuration / (60 * 1000)); // Return silence duration in minutes
    }
    
    return null; // If no messages, return null
  } catch (error) {
    console.error('Error fetching messages:', error);
    return null; // Return null if there was an error
  }
}

// Function that will post the duck image if the channel is silent. If not, reschedules for later
async function checkAndPostIfSilent(client, duck_channel, postTime, checkCount = 0) {
  // Check if the channel is silent.
  const silence = await checkChannelSilence(duck_channel);
  if (silence) {
    await postDuckImage(client, duck_channel);
  } else {
    // Increment the check count
    checkCount++;

    // Calculate the silence time
    const silenceTime = await getSilenceTime(duck_channel);
    if (silenceTime === null) {
      console.error('Failed to get silence time. Skipping this check.');
      return; // Exit if silence time could not be determined
    }

    // Calculate the remaining time until the channel has been silent for 5 minutes
    const remainingTime = (5 * 60) - silenceTime; // Remaining time in minutes
    console.log(`Channel is not silent. Scheduling another check in ${remainingTime * 60} seconds...`);

    // Schedule another check after the remaining time
    schedule.scheduleJob(moment().add(remainingTime, 'minutes').toDate(), async () => {
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

  // Define path for playerdata.json
  const playerDataPath = path.resolve('./data/playerdata.json');

  // Create playerdata.json if it does not exist
  try {
    if (!fs.existsSync(playerDataPath)) {
      fs.writeFileSync(playerDataPath, JSON.stringify({ players: [] }), 'utf8');
      console.log(`Created new playerdata.json at: ${playerDataPath}`);
    }
  } catch (error) {
    console.error(`Error creating playerdata.json: ${error.message}`);
    return; // Exit if there's an error creating the file
  }

  // Check if today is an active day
  if (!isActiveDay()) {
    console.log("Today is not an active day for posting the duck image.");
    return; // Exit if today is not an active day
  }

  // Making sure duck image has not been posted today
  if (!hasPostedToday()) {
    // If the current time is after 9 PM, do nothing
    if (now.hour() >= 21) {
      console.log("It's past 9 PM. Duck image will not be posted today.");
      return; // Exit the function if it's past 9 PM
    }

    // If the current time is past 5 PM but before 9 PM, post immediately
    if (now.hour() >= 17 && now.hour() < 21) {
      console.log("It's past 5 PM but before 9 PM. Posting immediately if the channel is silent.");
      await checkAndPostIfSilent(client, duck_channel, now);
    } else {
      // Randomize time between current time and 5 PM
      const randomHour = Math.floor(Math.random() * (17 - now.hour())) + now.hour(); // Random hour between current hour and 5 PM
      const randomMinute = Math.floor(Math.random() * 60); // Random minute

      // Set the time for posting
      const postTime = now.clone().hour(randomHour).minute(randomMinute).second(0);

      // Log the scheduled posting time
      console.log(`Duck image will be posted at: ${postTime.format('DD-MM-YYYY HH:mm:ss')}`); // Log the selected time

      // Schedule the job for today
      schedule.scheduleJob(postTime.toDate(), async () => {
        // Check if the channel is silent.
        console.log(`Checking silence for the scheduled post at: ${postTime.format('DD-MM-YYYY HH:mm:ss')}`);
        await checkAndPostIfSilent(client, duck_channel, postTime);
      });
    }
  } else {
    // Log that the duck image has already been posted today
    console.log("Duck image will not be posted again.");
  }

  // Schedule duck image posting for every day
  scheduleDailyDuckImagePosting(client, duck_channel);
  console.log("Daily duck image scheduler activated.");
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
    const randomHour = Math.floor(Math.random() * 7) + 10; // Random hour between 10 and 16
    const randomMinute = Math.floor(Math.random() * 60); // Random minute

    // Create a date object for the scheduled time
    const now = moment().tz('Europe/Helsinki'); // Get current time in Finland
    const postTime = now.clone().hour(randomHour).minute(randomMinute).second(0);

    // Log the selected posting time
    console.log(`Duck image will be scheduled for: ${postTime.format('YYYY-MM-DD HH:mm:ss')}`);

    // Schedule the job for the random time
    schedule.scheduleJob(postTime.toDate(), async () => {
      // Check if the channel is silent.
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
