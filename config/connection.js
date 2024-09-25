const {Sequelize} = require("sequelize");
const mysql = require('mysql2');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.PASS, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
  });

module.exports = sequelize;

