'use strict';
require('../loadenv.js')();

var Boom = require('boom');
var envIs = require('101/env-is');
var pick = require('101/pick');
var noop = require('101/noop');
var isObject = require('101/is-object');
var rollbar = require('rollbar');
var debug = require('debug')('sauron:errors');

if (process.env.ROLLBAR_KEY) {
  rollbar.init(process.env.ROLLBAR_KEY, {
    environment: process.env.NODE_ENV || 'development',
    branch: process.env._VERSION_GIT_BRANCH,
    codeVersion: process.env._VERSION_GIT_COMMIT,
    root: process.env.ROOT_DIR
  });
}

function create(message, data) {
  var err = new Error(message);
  err.data = data;
  log(err);
  return err;
}

function log (err, req) {
  if (!err.isBoom) {
    var message = !isObject(err) ? err : (err.message || 'Internal Server Error');
    err = boom(500, message, { err: err });
  }
  if (!req || !req.url || !req.method) {
    req = null;
  }
  err.reformat();
  var statusCode = err.output.statusCode;
  if (statusCode >= 500) {
    debug('Bad App Error: ',
      statusCode,
      req ? req.method : 'unknown url',
      req ? req.url : 'unknown method');
  }
  else {
    debug('Acceptable App Error: ',
      statusCode,
      req ? req.method : 'unknown url',
      req ? req.url : 'unknown method',
      err.message);
  }
  if (!envIs('test')) {
    report(err, req);
  }
  if (statusCode >= 500) {
    logDebug(err);
  }
}

function logDebug (err) {
  debug('--Boom Error--');
  debug(err.stack);
  if (err.data && err.data.err) {
    debug('--Original Error--');
    debug(err.data.err.stack);
  }
}

function report (err, req) {
  var custom = err.data || {};
  if (custom.err) { // prevent sending circular
    var errKeys;
    try {
      errKeys = Object.keys(custom.err);
    }
    catch (err) {
      errKeys = [];
    }
    custom.err = pick(custom.err, ['message', 'stack']);
  }
  rollbar.handleErrorWithPayloadData(err, { custom: custom }, req, noop);
}

function boom (code, msg, data) {
  return Boom.create(code, msg, data);
}

function errorResponder(err, req, res, next) {
  var message;
  if (!err.isBoom) {
    message = !isObject(err) ? err : (err.message || 'Internal Server Error');
    err = boom(500, message, { err: err });
  }
  err.reformat();
  if (message) {
    // sauron is more like to 500 than any other component (bc of weave)
    // because of this override unknown error messages with
    // the actual error messsage.
    err.output.payload.message = message;
  }
  // respond error
  res
    .status(err.output.statusCode)
    .json(err.output.payload);
  // log errors
  log(err, req);
}


module.exports.create = create;
module.exports.log = log;
module.exports.boom = boom;
module.exports.errorResponder = errorResponder;
