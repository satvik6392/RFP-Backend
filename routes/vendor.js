var express = require('express');
const vendorController = require('../controllers/vendorController');
const uploadFile = require('../middlewares/file_upload');
const auhtMiddlewares = require('../middlewares/authenticate');
var router = express.Router();
var { upload } = require('../config/multer');
const { roles } = require('../config/roles');


/* To get vendor list of a company / or a vendor details based on vendor id */
router.get('/vendorlist/:companyID/:vendorId?', auhtMiddlewares.authenticateToken, auhtMiddlewares.authorizeRole([roles.admin, roles.accounts, roles.procurmentManager]), vendorController.getVendorList);


/* To get vendors of a company based on a category */
router.get('/vendorlist/category/:companyID/:categoryId', auhtMiddlewares.authenticateToken, auhtMiddlewares.authorizeRole([roles.admin, roles.accounts, roles.procurmentManager]), vendorController.getVendorListByCategory);


/* To update the vendor status : Approve/Reject */
router.post('/updateStatus', upload.none(), auhtMiddlewares.authenticateToken, auhtMiddlewares.authorizeRole([roles.admin, roles.accounts]), vendorController.updateStatus);
// router.post('/',auhtMiddlewares.authenticateToken,auhtMiddlewares.checkAdmin, categoryController.addCategory);

/* To download the vendor data in a excel sheet */
router.get('/download-vendor-excel/:companyID', upload.none(), vendorController.downloadVendorExcel);
module.exports = router;
