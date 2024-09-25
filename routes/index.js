var express = require('express');
var router = express.Router();
var models = require('../config/initModels');

/* GET home page. */
router.get('/', async function(req, res, next) {
  console.log(models);
  var email = 'satvik.trivedi@velsof.com';
  const fetchUserFromDB = await models.users.findOne({ where: { email } });
  console.log(fetchUserFromDB);
  
  res.render('index', { title: fetchUserFromDB.dataValues.password });
});

module.exports = router;
