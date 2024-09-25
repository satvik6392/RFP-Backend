var express = require('express');
const authController = require('../controllers/authController');
var router = express.Router();
var {upload} = require('../config/multer');


router.post('/login',upload.none(),authController.login);

router.post('/admin-registration',upload.none(),authController.adminRegistration);

router.post('/vendor-registration',upload.none(),authController.vendorRegistration);

module.exports = router;
