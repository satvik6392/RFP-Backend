var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs = require('fs');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var categoryRouter = require('./routes/category');
var vendorRouter =  require('./routes/vendor');
var rfpRouter = require('./routes/rfp');


const  sequelize = require('./config/connection');
const upload = require('./config/multer');
const { request } = require('http');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
app.use(logger('combined', { stream: accessLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(upload.none());


// app.use('/', indexRouter);
app.use('/api/auth',authRouter);
app.use('/api/categories',categoryRouter);
app.use('/api/vendor',vendorRouter);
app.use('/api/rfp',rfpRouter);
app.use('/api/users',usersRouter);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

async function connectDB() {
    try {
      await sequelize.authenticate();
      // await sequelize.sync({ alter: true });
      console.log('Connection has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
    }
  }
  
connectDB();

module.exports = app;
