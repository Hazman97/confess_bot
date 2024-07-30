// db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // Adjust if `database.sqlite` is located elsewhere
});

module.exports = sequelize;
