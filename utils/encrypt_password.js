const bcrypt = require('bcrypt');

// Utility function example: Password comparison
exports.matchPassword = async (enteredPassword, hashedPassword) => {
    return await bcrypt.compare(enteredPassword, hashedPassword);
};