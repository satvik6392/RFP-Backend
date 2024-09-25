const models = require('../config/initModels'); // Adjust the path as needed


// Add Logs in log table
exports.createLog = async ({ user_id, req_url, action, details, ip_address, category }) => {
    try {
        const newLog = await models.logs.create({
            user_id,
            req_url,
            action,
            details,
            ip_address,
            category,
        });
        return newLog;
    } catch (error) {
        console.error('Error creating log entry:', error);
        throw error; // Re-throw the error to be handled by the caller
    }
};


