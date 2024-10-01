var express = require('express');
const authController = require('../controllers/authController');
var router = express.Router();
var {upload} = require('../config/multer');



// Login route - all users
router.post('/login',upload.none(),authController.login);


// admin registration/ company registration : creates new company if doesn't exist
router.post('/admin-registration',upload.none(),authController.verifyCaptcha, authController.adminRegistration);


// vendor registration
router.post('/vendor-registration',upload.none(),authController.verifyCaptcha, authController.vendorRegistration);

// To generate the captcha
router.get('/generate-captcha',upload.none(),authController.generateCaptcha);

//To verify the captcha - not in use as of now
router.post('/verify-captcha',upload.none(),authController.verifyCaptcha);

router.post('/generate-qr',upload.none(),authController.generateQR );
router.post('/verify-otp',upload.none(),authController.verifyOTP );



module.exports = router;
