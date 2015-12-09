'use strict';

var Start = require('./lib/start.js');
var ErrorCat = require('error-cat');
var error = new ErrorCat();
var log = require('./lib/logger.js')();

Start.startup(function (err) {
  if (err) { error.report(err, function () {
    log.fatal({ err: err }, 'Start.startup');
    process.exit();
  }); }
});
