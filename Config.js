const { Model, DataTypes } = require('sequelize');
const sequelize = require('./db');

class Config extends Model {}

Config.init({
  guildId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // Ensure unique configuration per guild
  },
  confessionChannelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  adminChannelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reportChannelId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.STRING,
    allowNull: false
  },
}, {
  sequelize,
  modelName: 'Config',
});

module.exports = Config;
