const Sequelize = require('sequelize');
const bcrypt = require('bcryptjs');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    user_id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('admin','vendor','procurement_manager','accounts'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Pending','Approved','Rejected'),
      allowNull: false,
      defaultValue: "Pending"
    },
    name: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    two_factor_secret: { // New column for storing TOTP secret key
      type: DataTypes.STRING(255),
      allowNull: true // Can be null if 2FA is not enabled
    },
    isTwoFactorEnabled: { // Optional: Track if 2FA is enabled
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
          if (user.password) {
              console.log(user.password);
              
              user.password = await bcrypt.hash(user.password, 10);
              
              console.log(user.password);
          }
      },
      beforeUpdate: async (user) => {
          if (user.password) {
              const salt = await bcrypt.genSalt(10);
              user.password = await bcrypt.hash(user.password, salt);
          }
      }
    },
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
