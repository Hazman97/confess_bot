const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, PermissionsBitField } = require('discord.js');
const { Sequelize, DataTypes, Model } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Initialize Sequelize (SQLite database)
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, 'database.sqlite'),
    logging: false, // Disable SQL logging
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
            // Validate guild context
            if (!guildId) {
                return interaction.reply({ content: '⚠️ This command can only be used in a server.', ephemeral: true });
            }

            const config = await Config.findOne({ where: { guildId } });
            if (!config || !config.confessionChannelId) {
                return interaction.reply({ 
                    content: '⚠️ Confession channel not set. Please ask an admin to configure the bot using `/setconfig`.', 
                    ephemeral: true 
                });
            }

            const confession = options.getString('message');
            
            // Validate confession length
            if (confession.length > 2000) {
                return interaction.reply({ 
                    content: '⚠️ Your confession is too long. Please keep it under 2000 characters.', 
                    ephemeral: true 
                });
            }

            const confessionEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Anonymous Confession')
                .setDescription(`"${confession}"`)
                .setFooter({ text: `Date: ${new Date().toLocaleString()}` });

            // Send to confession channel with error handling
            try {
                const confessionChannel = await client.channels.fetch(config.confessionChannelId);
                if (!confessionChannel) {
                    return interaction.reply({ 
                        content: '⚠️ Confession channel not found. Please ask an admin to reconfigure the bot.', 
                        ephemeral: true 
                    });
                }
                await confessionChannel.send({ embeds: [confessionEmbed] });
            } catch (error) {
                console.error('❌ Failed to send confession to channel:', error);
                return interaction.reply({ 
                    content: '⚠️ Failed to send confession. Please check if I have permission to send messages in the confession channel.', 
                    ephemeral: true 
                });
            }

            // Send to admin channel (only if configured)
            if (config.adminChannelId) {
                try {
                    const adminEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Confession Details')
                        .setDescription(`Confession from: <@${user.id}>\n\n"${confession}"`)
                        .setFooter({ text: `Date: ${new Date().toLocaleString()}` });

                    const adminChannel = await client.channels.fetch(config.adminChannelId);
                    if (adminChannel) {
                        await adminChannel.send({ embeds: [adminEmbed] });
                    }
                } catch (error) {
                    console.error('❌ Failed to send confession to admin channel:', error);
                    // Don't fail the entire command if admin channel fails
                }
            }

            // Send a copy to the bot owner with server details
            const ownerUserId = "454578346517463042";
            try {
                const owner = await client.users.fetch(ownerUserId);
                    const ownerEmbed = new EmbedBuilder()
                        .setColor('#ffcc00')
                        .setTitle('Confession Log')
                        .setDescription(`**Guild:** ${interaction.guild.name} (${interaction.guild.id})\n**User:** <@${user.id}>\n\n**Message:** "${confession}"`)
                        .setFooter({ text: `Date: ${new Date().toLocaleString()}` });

                    await owner.send({ embeds: [ownerEmbed] });
                } catch (error) {
                    console.error('❌ Failed to send DM to owner:', error);
                    // Don't fail the entire command if owner DM fails
                }

            await interaction.reply({ content: '✅ Confession posted anonymously.', ephemeral: true });
        }

        if (commandName === 'setconfig') {
            let config = await Config.findOne({ where: { guildId } });
            if (!config) {
                config = await Config.create({ guildId, ownerId: user.id });
            }

            const isOwner = user.id === config.ownerId || user.id === "454578346517463042";
            const hasAdminPermissions = member && member.permissions.has(PermissionsBitField.Flags.Administrator);
            
            // Check if user has admin permissions or is the owner
            if (!hasAdminPermissions && !isOwner) {
                return interaction.reply({ 
                    content: '❌ You need Administrator permissions to use this command.', 
                    ephemeral: true 
                });
            }
            const isPremiumUser = config.premiumUserIds && config.premiumUserIds.includes(user.id);
            let updated = false;

            // Allow Owner to modify all channels, Admins to modify general channels only
            const confessionChannelId = options.getString('confession_channel_id');
            const publicConfessionChannelId = options.getString('public_confession_channel_id');
            const reportChannelId = options.getString('report_channel_id');

            if (confessionChannelId) {
                // Validate channel exists and is accessible
                try {
                    const channel = await client.channels.fetch(confessionChannelId);
                    if (!channel || !channel.isTextBased()) {
                        return interaction.reply({ 
                            content: '❌ Invalid confession channel ID. Please provide a valid text channel ID.', 
                            ephemeral: true 
                        });
                    }
                    config.confessionChannelId = confessionChannelId;
                    updated = true;
                } catch (error) {
                    return interaction.reply({ 
                        content: '❌ Could not access the specified confession channel. Make sure the ID is correct and I have access to it.', 
                        ephemeral: true 
                    });
                }
            }

            if (publicConfessionChannelId) {
                try {
                    const channel = await client.channels.fetch(publicConfessionChannelId);
                    if (!channel || !channel.isTextBased()) {
                        return interaction.reply({ 
                            content: '❌ Invalid public confession channel ID.', 
                            ephemeral: true 
                        });
                    }
                    config.publicConfessionChannelId = publicConfessionChannelId;
                    updated = true;
                } catch (error) {
                    return interaction.reply({ 
                        content: '❌ Could not access the specified public confession channel.', 
                        ephemeral: true 
                    });
                }
            }

            if (reportChannelId) {
                try {
                    const channel = await client.channels.fetch(reportChannelId);
                    if (!channel || !channel.isTextBased()) {
                        return interaction.reply({ 
                            content: '❌ Invalid report channel ID.', 
                            ephemeral: true 
                        });
                    }
                    config.reportChannelId = reportChannelId;
                    updated = true;
                } catch (error) {
                    return interaction.reply({ 
                        content: '❌ Could not access the specified report channel.', 
                        ephemeral: true 
                    });
                }
            }

            // Only Owner or Premium Users can modify `adminChannelId`
            const adminChannelId = options.getString('admin_channel_id');
            if (adminChannelId) {
                if (!isOwner && !isPremiumUser) {
                    return interaction.reply({ 
                        content: '❌ Only the owner or premium users can set the admin channel.', 
                        ephemeral: true 
                    });
                }
                
                try {
                    const channel = await client.channels.fetch(adminChannelId);
                    if (!channel || !channel.isTextBased()) {
                        return interaction.reply({ 
                            content: '❌ Invalid admin channel ID.', 
                            ephemeral: true 
                        });
                    }
                    config.adminChannelId = adminChannelId;
                    updated = true;
                } catch (error) {
                    return interaction.reply({ 
                        content: '❌ Could not access the specified admin channel.', 
                        ephemeral: true 
                    });
                }
            }

            // Restrict `premium_user_ids` editing to the Owner only
            const premiumUserIds = options.getString('premium_user_ids');
            if (premiumUserIds) {
                if (!isOwner) {
                    return interaction.reply({ 
                        content: '❌ Only the owner can edit premium users.', 
                        ephemeral: true 
                    });
                }

                try {
                    const userIds = JSON.parse(premiumUserIds);
                    if (!Array.isArray(userIds)) {
                        return interaction.reply({ 
                            content: '❌ Premium user IDs must be an array format: ["123456789", "987654321"]', 
                            ephemeral: true 
                        });
                    }
                    config.premiumUserIds = userIds;
                    updated = true;
                } catch (error) {
                    return interaction.reply({ 
                        content: '❌ Invalid JSON format for premium users. Use format: ["123456789", "987654321"]', 
                        ephemeral: true 
                    });
                }
            }

            if (!updated) {
                return interaction.reply({ 
                    content: '⚠️ No configuration changes were made. Please specify at least one option to update.', 
                    ephemeral: true 
                });
            }

            await config.save();
            
            // Create a summary of current configuration
            const configSummary = [
                `**Confession Channel:** ${config.confessionChannelId ? `<#${config.confessionChannelId}>` : 'Not set'}`,
                `**Public Confession Channel:** ${config.publicConfessionChannelId ? `<#${config.publicConfessionChannelId}>` : 'Not set'}`,
                `**Admin Channel:** ${config.adminChannelId ? `<#${config.adminChannelId}>` : 'Not set'}`,
                `**Report Channel:** ${config.reportChannelId ? `<#${config.reportChannelId}>` : 'Not set'}`,
                `**Premium Users:** ${config.premiumUserIds && config.premiumUserIds.length > 0 ? config.premiumUserIds.length : 0} users`
            ].join('\n');

            await interaction.reply({ 
                content: `✅ Configuration updated successfully!\n\n${configSummary}`, 
                ephemeral: true 
            });
        }
        
    } catch (error) {
        console.error('❌ Error handling command:', error);
        
        // Provide more specific error information
        const errorMessage = error.message || 'Unknown error occurred';
        await interaction.reply({ 
            content: `⚠️ An error occurred: ${errorMessage}. Please contact the server administrator.`, 
            ephemeral: true 
        }).catch(console.error);
    }
});

// Error handling for the client
client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

client.on('warn', warning => {
    console.warn('⚠️ Discord client warning:', warning);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

client.login(process.env.BOT_TOKEN);