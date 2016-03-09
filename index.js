'use strict';

var Start = require('./lib/start.js');
var ErrorCat = require('error-cat');
var error = new ErrorCat();
var log = require('./lib/logger.js').getChild(__filename)

Start.startup(function (err) {
  if (err) {
    if (error.canUseRollbar()) { // We might not have a ROLLBAR_KEY
      error.report(err, function () {
        log.fatal({ err: err }, 'Start.startup');
        process.exit();
      });
    } else {
      log.fatal({ err: err }, 'Start.startup');
      process.exit();
    }
  }
});
