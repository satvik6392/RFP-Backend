var express = require('express');
const authController = require('../controllers/authController');
var router = express.Router();
var {upload} = require('../config/multer');



// Login route - all users
router.post('/login',upload.none(),authController.login);


// admin registration/ company registration : creates new company if doesn't exist
router.post('/admin-registration',upload.none(),authController.adminRegistration);


// vendor registration
router.post('/vendor-registration',upload.none(),authController.vendorRegistration);

module.exports = router;
