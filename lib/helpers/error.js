'use strict';
require('../loadenv.js')();

var Boom = require('boom');
var envIs = require('101/env-is');
var pick = require('101/pick');
var noop = require('101/noop');
var rollbar = require('rollbar');
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

function log (err) {
  if (process.env.LOG_ERRORS) {
    console.error(err.message);
    console.error(err.stack);
    if (err.data) {
      console.error(err.data);
    }
  }
  if (!envIs('development')) {
    report(err);
  };
}

function report (err) {
  var custom = err.data || {};
  var req = custom.req;
  delete custom.req;
  if (custom.err) {
    var errKeys;
    try {
      errKeys = Object.keys(custom.err);
    }
    catch (err) {
      errKeys = [];
    }
    custom.err = pick(custom.err, ['message', 'stack'].concat(errKeys));
  }
  rollbar.handleErrorWithPayloadData(err, {custom: custom}, req, noop);
}

function boom (code, msg, data) {
  return Boom.create(code, msg, data);
}

function errorResponder(err, req, res, next) {
  if (!err.isBoom) {
    err = boom(500, 'internal', err);
  }
  log(err);
  err.output.payload.error = err.data;
  res.status(err.output.statusCode).json(err.output.payload);
}


module.exports.create = create;
module.exports.log = log;
module.exports.boom = boom;
module.exports.errorResponder = errorResponder;
