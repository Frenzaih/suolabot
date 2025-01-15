const { ActivityType } = require('discord.js');
const axios = require('axios');

async function updateStatus(client) {
    try {
        const response = await axios.get(`https://api.mcstatus.io/v2/status/java/${process.env.MC_SERVER_IP}`);
        const { online, players } = response.data;

        if (online) {
            const playerCount = players.online;

            if (Array.isArray(players.list) && players.list.length > 0) {
                // Map the player names using 'name_clean' and join them
                const playerNames = players.list.map(player => player.name_clean).join(', ');

                // Set the bot's status to display the player names
                await client.user.setActivity(
                    `: ${playerNames}`,
                    { type: ActivityType.Playing }
                );
            } else {
                await client.user.setActivity(''); // Clear status if no players
            }
        } else {
            await client.user.setActivity(''); // Clear status if server is offline
        }
    } catch (error) {
        console.error('Failed to update status:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data); // Log detailed error response from the API
        }
        await client.user.setActivity(''); // Keep the activity blank if there's an error
    }
}

module.exports = { updateStatus };
