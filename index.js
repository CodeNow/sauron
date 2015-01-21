'use strict';
require('./lib/loadenv.js')();
var error = require('./lib/helpers/error.js');
var app = require('./lib/app.js');
var start = require('./lib/start.js');
var error = require('./lib/helpers.js');

start(function (err) {
  if (err) {
    return error.log(err);
  }
  app.listen(process.env.PORT);
});

module.exports = app;
