const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  description: 'Fetches a random image from lintukuva.fi',
  execute: async (msg) => {
    try {
      const response = await axios.get('https://www.lintukuva.fi/');
      const $ = cheerio.load(response.data);
      const images = [];

      // Base URL for lintukuva.fi
      const baseUrl = 'https://www.lintukuva.fi/';

      // Select image elements and filter valid image formats
      $('img').each((index, element) => {
        const imgSrc = $(element).attr('src');
        if (imgSrc) {
          // Check if the image URL ends with a valid image format and is not a GIF
          if (/\.(jpg|jpeg|png|webp)$/i.test(imgSrc)) {
            // If the imgSrc is a relative URL, prepend the base URL
            const completeUrl = imgSrc.startsWith('http') ? imgSrc : baseUrl + imgSrc;
            images.push(completeUrl);
          }
        }
      });

      // Send a random image URL from the fetched images
      if (images.length > 0) {
        const randomImage = images[Math.floor(Math.random() * images.length)];
        msg.channel.send(randomImage); // Send the complete image URL
      } else {
        msg.channel.send('No valid images found.');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      msg.channel.send('Failed to fetch images.');
    }
  }
};
