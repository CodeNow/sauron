'use strict';

var Start = require('./lib/start.js');
var ErrorCat = require('error-cat');
var error = new ErrorCat();

Start.startup(function (err) {
  if (err) {
    throw error.createAndReport(err, 'failed to start');
  }
});
