var express = require('express');
const rfpController = require('../controllers/rfpController');
const uploadFile = require('../middlewares/file_upload');
const auhtMiddlewares = require('../middlewares/authenticate');
var router = express.Router();
var {upload} = require('../config/multer');
const { roles } = require('../config/roles');


/* To get all rfps in a list of a particular company */
router.get('/all/:companyID',upload.none(),auhtMiddlewares.authenticateToken,auhtMiddlewares.authorizeRole([roles.admin,roles.accounts,roles.procurmentManager]),rfpController.getAllRfps);

/* To create a rfp for a company */
router.post('/createrfp',upload.none(),auhtMiddlewares.authenticateToken,auhtMiddlewares.authorizeRole([roles.admin,roles.procurmentManager]), rfpController.createRfp);

/* To get rfp based on a user id : vendor will get rfps in which he is invited. */
router.get('/getrfp/:companyID/:userId',auhtMiddlewares.authenticateToken,auhtMiddlewares.authorizeRole([roles.admin,roles.vendor,roles.accounts,roles.procurmentManager]), rfpController.getRFPByUserId);

/* To apply quotes on a rfp */
router.post('/apply/:companyID',upload.none(), auhtMiddlewares.authenticateToken,auhtMiddlewares.authorizeRole([roles.vendor]), rfpController.applyQuotes);

/* To get applied quotes on a rfp */
router.get('/quotes/:companyID',upload.none(),auhtMiddlewares.authenticateToken,auhtMiddlewares.authorizeRole([roles.admin,roles.procurmentManager,roles.accounts]),rfpController.getQuotes);
module.exports = router;
