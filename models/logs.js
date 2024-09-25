// models/logs.js
const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('logs', {
        log_id: {
            autoIncrement: true,
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // Nullable if the action can be done by guests
        },
        req_url: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        action: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
        category: {
            type: DataTypes.ENUM('success', 'error', 'failed'),
            allowNull: false,
        },
    }, {
        sequelize,
        tableName: 'logs',
        timestamps: true, // Set to true if you want automatic timestamps
    });
};
