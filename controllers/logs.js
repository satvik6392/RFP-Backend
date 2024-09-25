// routes/logs.js
const express = require('express');
const router = express.Router();
const models = require('../config/initModels'); // Adjust the path as needed

router.post('/logs', async (req, res) => {
    const { user_id, req_url, action, details, ip_address, category } = req.body;

    try {
        const newLog = await logs.create({
            user_id,
            req_url,
            action,
            details,
            ip_address,
            category,
        });

        return;
    } catch (error) {
        console.error('Error creating log entry:', error);
        return;
    }
});

module.exports = router;
