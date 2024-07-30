const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Configuration store
const config = {
  premiumRoleId: '830359793285595191',
  confessionChannelId: '947343203445641297',
  reportChannelId: '830359793285595193'
};

// Define commands
const commands = [
  {
    name: 'confess',
    description: 'Submit an anonymous confession',
    options: [
      {
        name: 'message',
        type: 3, // STRING type
        description: 'The confession message',
        required: true,
      },
    ],
  },
  {
    name: 'report',
    description: 'Report a confession',
    options: [
      {
        name: 'message_link',
        type: 3, // STRING type
        description: 'The link to the message you want to report',
        required: true,
      },
    ],
  },
  {
    name: 'setconfig',
    description: 'Set bot configuration',
    options: [
      {
        name: 'premium_role_id',
        type: 3, // STRING type
        description: 'The role ID for premium users',
        required: false,
      },
      {
        name: 'confession_channel_id',
        type: 3, // STRING type
        description: 'The channel ID for confessions',
        required: false,
      },
      {
        name: 'report_channel_id',
        type: 3, // STRING type
        description: 'The channel ID for reports',
        required: false,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', async () => {
  console.log('Bot is online!');

  // Fetch and log roles in the guild
  const guildId = '830359793079156756'; // Your guild (server) ID
  const guild = client.guilds.cache.get(guildId);

  if (guild) {
    console.log(`Roles in guild: ${guild.name}`);
    guild.roles.cache.forEach(role => {
      console.log(`Role name: ${role.name}, ID: ${role.id}`);
    });
  } else {
    console.log('Guild not found');
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction;

  if (commandName === 'confess') {
    if (!config.confessionChannelId) {
      await interaction.reply({ content: 'Confession channel is not set. Please contact an admin.', ephemeral: true });
      return;
    }

    const confession = options.getString('message');
    const isPremium = config.premiumRoleId && interaction.member.roles.cache.has(config.premiumRoleId);

    // Moderation check (optional)
    if (confession.includes('banned_word')) {
      await interaction.reply({ content: 'Your confession contains inappropriate content and cannot be posted.', ephemeral: true });
      return;
    }

    // Create an embed for the confession message
    const confessionEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Anonymous Confession')
      .setDescription(`"${confession}"`)
      .addFields({ name: '❗ Note:', value: 'If this confession is ToS-breaking or overtly hateful, you can report it using `/report [message link]`', inline: false })
      .setFooter({ text: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` });

    if (isPremium) {
      confessionEmbed.addFields({ name: 'Confessor:', value: `<@${user.id}>`, inline: false }); // Show who confessed if premium
    }

    try {
      const confessionChannel = await client.channels.fetch(config.confessionChannelId);
      await confessionChannel.send({ embeds: [confessionEmbed] });
      await interaction.reply({ content: 'Your confession has been posted anonymously.', ephemeral: true });
    } catch (error) {
      console.error('Error posting confession:', error);
      await interaction.reply({ content: 'There was an error posting your confession. Please try again later.', ephemeral: true });
    }
  }

  if (commandName === 'report') {
    if (!config.reportChannelId) {
      await interaction.reply({ content: 'Report channel is not set. Please contact an admin.', ephemeral: true });
      return;
    }

    const messageLink = options.getString('message_link');

    try {
      const reportChannel = await client.channels.fetch(config.reportChannelId);
      await reportChannel.send(`Report received:\nMessage Link: ${messageLink}\nReported by: <@${interaction.user.id}>`);
      await interaction.reply({ content: 'Your report has been submitted.', ephemeral: true });
    } catch (error) {
      console.error('Error reporting confession:', error);
      await interaction.reply({ content: 'There was an error submitting your report. Please try again later.', ephemeral: true });
    }
  }

  if (commandName === 'setconfig') {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply({ content: 'You do not have permission to set configurations.', ephemeral: true });
      return;
    }

    const premiumRoleId = options.getString('premium_role_id');
    const confessionChannelId = options.getString('confession_channel_id');
    const reportChannelId = options.getString('report_channel_id');

    if (premiumRoleId) config.premiumRoleId = premiumRoleId;
    if (confessionChannelId) config.confessionChannelId = confessionChannelId;
    if (reportChannelId) config.reportChannelId = reportChannelId;

    await interaction.reply({ content: 'Configuration updated successfully.', ephemeral: true });
  }
});

// Log in to Discord with your app's token
client.login(process.env.BOT_TOKEN);
