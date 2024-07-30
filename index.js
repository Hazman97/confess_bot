const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(__dirname, 'database.sqlite'), // Ensure this path is correct
});

// Define the Config model
const Config = sequelize.define('Config', {
  guildId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  confessionChannelId: DataTypes.STRING,
  adminChannelId: DataTypes.STRING,
  reportChannelId: DataTypes.STRING,
  adminId: DataTypes.STRING,
  ownerId: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Sync models
sequelize.sync().then(() => {
  console.log('Database synchronized.');
}).catch(error => {
  console.error('Error synchronizing database:', error);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

// Hardcoded owner ID
const ownerId = '454578346517463042'; // Replace with your actual Discord user ID

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
        name: 'confession_channel_id',
        type: 3, // STRING type
        description: 'The channel ID for confessions',
        required: false,
      },
      {
        name: 'admin_channel_id',
        type: 3, // STRING type
        description: 'The channel ID for admin confessions',
        required: false,
      },
      {
        name: 'report_channel_id',
        type: 3, // STRING type
        description: 'The channel ID for reports',
        required: false,
      },
      {
        name: 'admin_id',
        type: 3, // STRING type
        description: 'The ID of the admin who can see detailed confessions',
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
    console.error('Error refreshing application commands:', error);
  }
})();

client.once('ready', async () => {
  console.log('Bot is online!');
});

client.on('interactionCreate', async interaction => {
  console.log(`Received command: ${interaction.commandName}`);

  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction;

  try {
    if (commandName === 'confess') {
      console.log('Handling confess command');

      const config = await Config.findOne({ where: { guildId: interaction.guildId } });

      if (!config || !config.confessionChannelId || !config.adminChannelId) {
        await interaction.reply({ content: 'Confession channels are not set. Please contact an admin.', ephemeral: true });
        return;
      }

      const confession = options.getString('message');

      // Create confession embed
      const confessionEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Anonymous Confession')
        .setDescription(`"${confession}"`)
        .setFooter({ text: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` });

      // Send confession to the public confession channel
      try {
        const confessionChannel = await client.channels.fetch(config.confessionChannelId);
        await confessionChannel.send({ embeds: [confessionEmbed] });
      } catch (err) {
        console.error('Error fetching or sending message to confession channel:', err);
      }

      // Send details to the admin channel
      if (config.adminChannelId && config.adminId) {
        try {
          const adminChannel = await client.channels.fetch(config.adminChannelId);
          const adminEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Confession Details')
            .setDescription(`Confession from: <@${user.id}>\n\n"${confession}"`)
            .setFooter({ text: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` });
          await adminChannel.send({ embeds: [adminEmbed] });
        } catch (err) {
          console.error('Error fetching or sending message to admin channel:', err);
        }
      }

      // Send confession to bot owner's DM
      try {
        const owner = await client.users.fetch(ownerId);
        const dmEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('New Anonymous Confession')
          .setDescription(`Confession from: <@${user.id}>\n\n"${confession}"`)
          .setFooter({ text: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` });
        await owner.send({ embeds: [dmEmbed] });
      } catch (err) {
        console.error('Error sending DM to owner:', err);
      }

      await interaction.reply({ content: 'Your confession has been posted anonymously.', ephemeral: true });
    }

    if (commandName === 'report') {
      console.log('Handling report command');

      const config = await Config.findOne({ where: { guildId: interaction.guildId } });

      if (!config || !config.reportChannelId) {
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

      console.log('Handling setconfig command');

      const confessionChannelId = options.getString('confession_channel_id');
      const adminChannelId = options.getString('admin_channel_id');
      const reportChannelId = options.getString('report_channel_id');
      const adminId = options.getString('admin_id');

      let config = await Config.findOne({ where: { guildId: interaction.guildId } });

      if (!config) {
        // Create a new config entry with the ownerId
        config = await Config.create({
          guildId: interaction.guildId,
          ownerId: ownerId, // Set the ownerId here
          confessionChannelId,
          adminChannelId,
          reportChannelId,
          adminId
        });
      } else {
        // Update existing configuration
        if (confessionChannelId) config.confessionChannelId = confessionChannelId;
        if (adminChannelId) config.adminChannelId = adminChannelId;
        if (reportChannelId) config.reportChannelId = reportChannelId;
        if (adminId) config.adminId = adminId;

        await config.save();
      }

      await interaction.reply({ content: 'Configuration updated successfully.', ephemeral: true });
    }

  } catch (error) {
    console.error('Error handling command:', error);
    await interaction.reply({ content: 'There was an error processing your command. Please try again later.', ephemeral: true });
  }
});

client.login(process.env.BOT_TOKEN);
