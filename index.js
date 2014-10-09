'use strict';
require('./lib/loadenv.js')();
var error = require('./lib/helpers/error.js');
var app = require('./lib/app.js');
var start = require('./lib/start.js');

start(function (err) {
  if (err) {
    error.log(err);
    return process.exit(1);
  }
  app.listen(process.env.PORT);
});

module.exports = app;
