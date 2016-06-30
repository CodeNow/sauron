'use strict'

var Start = require('./lib/start.js')
var error = require('error-cat')
var log = require('./lib/logger.js')()

Start.startup(function (err) {
  if (err) {
    error.report(err, function () {
      log.fatal({ err: err }, 'Start.startup')
      process.exit()
    })
  }
})
