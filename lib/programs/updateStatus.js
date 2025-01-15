const { ActivityType } = require('discord.js');
const axios = require('axios');

async function updateStatus(client) {
    try {
        const response = await axios.get(`https://api.mcstatus.io/v2/status/java/${process.env.MC_SERVER_IP}`);
        const { online, players } = response.data;

        if (online) {
            const playerCount = players.online;
            client.user.setActivity(
                `${playerCount} online`,
                { type: ActivityType.Watching }
            );
        } else {
            client.user.setActivity(''); // Clear status if server is offline
        }
    } catch (error) {
        console.error('Failed to update status:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data); // Log detailed error response from the API
        }
        client.user.setActivity(''); // Keep the activity blank if there's an error
    }
}

module.exports = { updateStatus };
