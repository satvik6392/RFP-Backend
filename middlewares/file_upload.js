const multer = require('multer');
const { upload } = require('../config/multer');

const uploadFile = (fieldName) => {
    console.log("coming in middleware how??");
    
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (err) {
                // Handle Multer-specific errors (like file size or invalid mimetype)
                if (err instanceof multer.MulterError) {
                    return res.status(400).json({ "response": "error", "message": err.message });
                }
                // Handle other errors (e.g., invalid file types)
                return res.status(400).json({ "response": "error", "message": err.message });
            }
            // File upload was successful, move to the next middleware/controller
            next();
        });
    };
};

module.exports = uploadFile;