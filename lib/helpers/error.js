'use strict';
require('../loadenv.js')();

var Boom = require('boom');

function create(message, data) {
  var err = new Error(message);
  err.data = data;
  log(err);
  return err;
}

function log (err) {
  if (process.env.NODE_ENV !== 'test') {
    console.error(err.message);
    console.error(err.stack);
    if (err.data) {
      console.error(err.data);
    }
  }
}

function boom (code, msg, data) {
  return Boom.create(code, msg, data);
}

function errorResponder(err, req, res, next) {
  if (!err.isBoom) {
    err = boom(500, 'internal', { err: err });
  }
  if (process.env.LOG_ERRORS) {
    log(err, req);
  }
  res.json(err.output.statusCode, err.output.payload);
}


module.exports.create = create;
module.exports.log = log;
module.exports.boom = boom;
module.exports.errorResponder = errorResponder;
