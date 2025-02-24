const { Model, DataTypes } = require('sequelize');
const sequelize = require('./db'); // Ensure this points to your database connection file

class Config extends Model {}

Config.init(
    {
        guildId: { type: DataTypes.STRING, allowNull: false, unique: true },
        confessionChannelId: { type: DataTypes.STRING, allowNull: true },
        publicConfessionChannelId: { type: DataTypes.STRING, allowNull: true },
        adminChannelId: { type: DataTypes.STRING, allowNull: true },
        reportChannelId: { type: DataTypes.STRING, allowNull: true },
        ownerId: { type: DataTypes.STRING, allowNull: false },
        premiumUserIds: { type: DataTypes.JSON, defaultValue: [] },
    },
    {
        sequelize,
        modelName: 'Config',
        tableName: 'Configs',
        timestamps: false, // Disable createdAt and updatedAt
    }
);

module.exports = Config;
