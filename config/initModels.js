const { DataTypes } = require("sequelize");
const sequelize = require('./connection')
const initModels = require("../models/init-models");

const models = initModels(sequelize, DataTypes);

module.exports = models;
