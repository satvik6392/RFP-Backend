var DataTypes = require("sequelize").DataTypes;
var _categories = require("./categories");
var _company = require("./company");
var _quotes = require("./quotes");
var _rfp_to_vendor_mapping = require("./rfp_to_vendor_mapping");
var _rfps = require("./rfps");
var _tokens = require("./tokens");
var _users = require("./users");
var _vendors = require("./vendors");
var _vendors_to_category_mapping = require("./vendors_to_category_mapping");
var _logs = require("./logs");

function initModels(sequelize) {
  var categories = _categories(sequelize, DataTypes);
  var company = _company(sequelize, DataTypes);
  var quotes = _quotes(sequelize, DataTypes);
  var rfp_to_vendor_mapping = _rfp_to_vendor_mapping(sequelize, DataTypes);
  var rfps = _rfps(sequelize, DataTypes);
  var tokens = _tokens(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);
  var vendors = _vendors(sequelize, DataTypes);
  var vendors_to_category_mapping = _vendors_to_category_mapping(sequelize, DataTypes);
  var logs = _logs(sequelize, DataTypes); // Initialize the logs model

  // Define associations
  users.hasMany(logs, {
      foreignKey: 'user_id', // Foreign key in logs table
      sourceKey: 'user_id',  // Primary key in users table
  });

  logs.belongsTo(users, {
      foreignKey: 'user_id', // Foreign key in logs table
      targetKey: 'user_id',  // Primary key in users table
  });

  users.hasOne(vendors, {
    foreignKey: 'user_id', // Foreign key in the vendors table
    sourceKey: 'user_id', // Key in the users table
  });

  vendors.belongsTo(users, {
    foreignKey: 'user_id', // Foreign key in the vendors table
    targetKey: 'user_id', // Key in the users table
  });

  users.hasMany(vendors_to_category_mapping, {
    foreignKey: 'user_id', // Foreign key in the vendors_to_category_mapping table
    sourceKey: 'user_id',  // Key in the vendors table
  });

  // Association between vendors_to_category_mapping and vendors
  vendors_to_category_mapping.belongsTo(users, {
    foreignKey: 'user_id', // Foreign key in the vendors_to_category_mapping table
    targetKey: 'user_id',  // Key in the vendors table
  });

  vendors_to_category_mapping.belongsTo(categories, {
    foreignKey: 'category_id', // Foreign key in vendors_to_category_mapping
    targetKey: 'id',           // Primary key in categories
  });

  categories.hasMany(vendors_to_category_mapping, {
    foreignKey: 'category_id',
    sourceKey: 'id',
  });

  // Rfp has many RfpToVendorMapping entries (one-to-many relationship)
  rfps.hasMany(rfp_to_vendor_mapping, {
    foreignKey: 'rfp_id',       // Foreign key in rfp_to_vendor_mapping table
    sourceKey: 'id',            // Primary key in rfps table
  });

  // RfpToVendorMapping belongs to Rfp (many-to-one relationship)
  rfp_to_vendor_mapping.belongsTo(rfps, {
    foreignKey: 'rfp_id',       // Foreign key in rfp_to_vendor_mapping table
    targetKey: 'id',            // Primary key in rfps table
  });

  users.hasMany(rfp_to_vendor_mapping, {
    foreignKey: 'user_id', // Assuming vendor_id in rfp_to_vendor_mapping references user_id
    sourceKey: 'user_id',
  });

  rfp_to_vendor_mapping.belongsTo(users, {
    foreignKey: 'user_id',
    targetKey: 'user_id',
  });


  users.hasMany(quotes, {
    foreignKey: 'vendor_id', // Foreign key in the quotes table
    sourceKey: 'user_id', // Key in the users table
});

quotes.belongsTo(users, {
    foreignKey: 'vendor_id', // Foreign key in the quotes table
    targetKey: 'user_id', // Key in the users table
});

rfps.hasMany(quotes, {
    foreignKey: 'rfp_id', // Foreign key in the quotes table
    sourceKey: 'id', // Key in the rfps table
});

quotes.belongsTo(rfps, {
    foreignKey: 'rfp_id', // Foreign key in the quotes table
    targetKey: 'id', // Key in the rfps table
});


  return {
    categories,
    company,
    quotes,
    rfp_to_vendor_mapping,
    rfps,
    tokens,
    users,
    vendors,
    vendors_to_category_mapping,
    logs
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
