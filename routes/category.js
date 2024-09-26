var express = require('express');
const categoryController = require('../controllers/categoryController');
const uploadFile = require('../middlewares/file_upload');
const auhtMiddlewares = require('../middlewares/authenticate');
const { roles } = require('../config/roles');
const multer = require('multer');
var router = express.Router();
const {upload} = require('../config/multer');
// var uploadFile = require('../middlewares/file_upload');

/* To get the list of category of a particular company */
router.get('/:companyId/:categoryId?', categoryController.getCategory);

/* To add a new category */
router.post('/',auhtMiddlewares.authenticateToken,auhtMiddlewares.authorizeRole([roles.admin,roles.procurmentManager]), categoryController.addCategory);

router.delete('/:categoryId',auhtMiddlewares.authenticateToken,auhtMiddlewares.authorizeRole([roles.admin,roles.procurmentManager]),upload.none(),categoryController.deleteCategory);

module.exports = router;
