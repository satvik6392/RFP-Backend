var express = require('express');
const userController = require('../controllers/userController');
const uploadFile = require('../middlewares/file_upload');
const auhtMiddlewares = require('../middlewares/authenticate');
var router = express.Router();
var { upload } = require('../config/multer');
const { roles } = require('../config/roles');

/* Add new users  */
router.post('/',auhtMiddlewares.authenticateToken,auhtMiddlewares.authorizeRole([roles.admin]),upload.none(), userController.addUser);


/* To get the list of company : used when vendor wants to register for a company */
router.get('/company-list',userController.getCompanyList);
module.exports = router;
