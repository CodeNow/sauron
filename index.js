'use strict';
require('./lib/loadenv.js')();
if (process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic');
}
var error = require('./lib/helpers/error.js');
var app = require('./lib/app.js');
var start = require('./lib/start.js');

start(function (err) {
  if (err) {
    return error.log(err);
  }
  app.listen(process.env.PORT);
});

module.exports = app;
