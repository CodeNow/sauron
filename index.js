'use strict';
require('./lib/loadenv.js')();
var error = require('./lib/error.js');
var app = require('./lib/app.js');
var start = require('./lib/startup.js');

start(function (err) {
  if (err) {
    error('unable to start', err);
    process.exit(1);
  }
  app.listen(process.env.PORT);
});

module.exports = app;
