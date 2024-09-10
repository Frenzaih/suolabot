const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');


module.exports = {
    data: new SlashCommandBuilder()
      .setName('emoji')
      .setDescription('Manage emojis on the server or within a message.')
      .addSubcommand(subcommand =>
        subcommand
          .setName('add')
          .setDescription('Add an emoji to the server or a message.')
          .addStringOption(option =>
            option.setName('input')
              .setDescription('Emoji or message ID to add emoji from')
              .setRequired(true))
          .addStringOption(option =>
            option.setName('name') // This is the option for the emoji name
              .setDescription('The name for the emoji being added to the server')
              .setRequired(true))
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove')
          .setDescription('Remove an emoji from the server or a message.')
          .addStringOption(option =>
            option.setName('input')
              .setDescription('Emoji or message ID to remove emoji from')
              .setRequired(true))
      ),
  
      async execute(interaction) {
        // Check if the user has administrator permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          return;
        }
      
        const subcommand = interaction.options.getSubcommand();
        const input = interaction.options.getString('input');
      
        if (subcommand === 'add') {
          const emojiName = interaction.options.getString('name'); // Correctly get the name for the new emoji
          await handleAddEmoji(interaction, input, emojiName);
        } else if (subcommand === 'remove') {
          await handleRemoveEmoji(interaction, input);
        }
      }
  };

// Function to handle adding an emoji
async function handleAddEmoji(interaction, input, emojiName) {
  try {
    // Validate emoji name length and character restrictions
    const trimmedEmojiName = emojiName.trim(); // Trim whitespace

    if (!trimmedEmojiName) {
    await interaction.reply({ content: 'Emoji name cannot be empty.', ephemeral: true });
    return;
    }

    if (trimmedEmojiName.length < 2 || trimmedEmojiName.length > 32) {
    await interaction.reply({ content: 'Emoji name must be between 2 and 32 characters.', ephemeral: true });
    return;
    }

    // Check for restricted characters (example: ö, ä, etc.)
    const restrictedCharacters = /[öäå]/; // Adjust this regex as needed
    if (restrictedCharacters.test(trimmedEmojiName)) {
    await interaction.reply({ content: 'Emoji name cannot contain special characters like ö, ä, or å.', ephemeral: true });
    return;
    }

    if (isMessageId(input)) {
      const message = await interaction.channel.messages.fetch(input);
      const emojis = message.content.match(/<a?:\w+:\d+>/g);

      if (!emojis || emojis.length === 0) {
        await interaction.reply({ content: 'No emojis found in the message with the provided ID.', ephemeral: true });
        return;
      }

      if (emojis.length > 1) {
        await interaction.reply({ content: 'The message contains more than one emoji. Please provide a message with only one emoji.', ephemeral: true });
        return;
      }

      // Extract emoji data from the message
      const emoji = emojis[0];
      await addEmojiToServer(interaction, emoji, emojiName);

    } else if (isEmoji(input)) {
      await addEmojiToServer(interaction, input, emojiName);
    } else {
      await interaction.reply({ content: 'Invalid input. Please provide a valid emoji or message ID.', ephemeral: true });
    }
  } catch (error) {
    console.error('Error adding emoji:', error);
    await interaction.reply({ content: 'An error occurred while adding the emoji.', ephemeral: true });
  }
}

// Function to handle removing an emoji
async function handleRemoveEmoji(interaction, input) {
  try {
    if (isMessageId(input)) {
      const message = await interaction.channel.messages.fetch(input);
      const emojis = message.content.match(/<a?:\w+:\d+>/g);

      if (!emojis || emojis.length === 0) {
        await interaction.reply({ content: 'No emojis found in the message with the provided ID.', ephemeral: true });
        return;
      }

      if (emojis.length > 1) {
        await interaction.reply({ content: 'The message contains more than one emoji. Please provide a message with only one emoji.', ephemeral: true });
        return;
      }

      // Extract emoji data from the message
      const emoji = emojis[0];
      await removeEmojiFromServer(interaction, emoji);

    } else if (isEmoji(input)) {
      await removeEmojiFromServer(interaction, input);
    } else {
      await interaction.reply({ content: 'Invalid input. Please provide a valid emoji or message ID.', ephemeral: true });
    }
  } catch (error) {
    console.error('Error removing emoji:', error);
    await interaction.reply({ content: 'An error occurred while removing the emoji.', ephemeral: true });
  }
}

// Helper function to check if input is a message ID
function isMessageId(input) {
  return /^\d{17,19}$/.test(input);
}

// Helper function to check if input is an emoji
function isEmoji(input) {
  return /<a?:\w+:\d+>/.test(input);
}

// Function to add an emoji to the server
async function addEmojiToServer(interaction, emoji, emojiName) {
  try {
    // Validate emoji name length
    if (emojiName.length < 2 || emojiName.length > 32) {
      await interaction.reply({ content: 'Emoji name must be between 2 and 32 characters.', ephemeral: true });
      return;
    }

    const emojiId = emoji.match(/\d+/)[0];
    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
    
    const addedEmoji = await interaction.guild.emojis.create({
      attachment: emojiUrl,
      name: emojiName
    });
    await interaction.reply(`Emoji added successfully: ${addedEmoji}`);
  } catch (error) {
    console.error('Error adding emoji to server:', error);
    await interaction.reply({ content: 'An error occurred while adding the emoji to the server.', ephemeral: true });
  }
}

// Function to remove an emoji from the server
async function removeEmojiFromServer(interaction, emoji) {
    try {
      const emojiId = emoji.match(/\d+/)[0]; // Extract the emoji ID from the input
      const guildEmoji = interaction.guild.emojis.cache.get(emojiId); // Get the emoji from the guild
  
      if (!guildEmoji) {
        await interaction.reply({ content: 'Emoji not found on this server.', ephemeral: true });
        return;
      }
  
      // Reply with the emoji being removed, without the name
      await interaction.reply(`Removing emoji: ${guildEmoji}`);
  
      // Now remove the emoji from the server
      await guildEmoji.delete();
      // No follow-up message
    } catch (error) {
      console.error('Error removing emoji from server:', error);
      await interaction.reply({ content: 'An error occurred while removing the emoji from the server.', ephemeral: true });
    }
  }
  