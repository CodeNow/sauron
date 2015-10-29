'use strict';
require('loadenv')();

var ip = require('ip');
var ErrorCat = require('error-cat');
var error = new ErrorCat();

var Redis = require('./redis.js');
var log = require('../logger.js')();

module.exports = Peers;

/**
 * Module used to keep track of weave network peers
 */
function Peers () { }

/**
 * get array of routers across network
 * @param  {Function} cb (err, [peers])
 */
Peers.getList = function (cb) {
  var key = process.env.WEAVE_PEER_NAMESPACE + process.env.ORG_ID;
  log.info({ key: key }, 'getList');
  Redis.client.smembers(key, Peers._handleErr(cb, 'getList failed', {
    key: key,
    org: process.env.ORG_ID
  }));
};

/**
 * add self to list of peers
 * @param  {Function} cb (err)
 */
Peers.addSelf = function (cb) {
  var key = process.env.WEAVE_PEER_NAMESPACE + process.env.ORG_ID;
  log.info({ key: key, host: ip.address() }, 'addSelf');
  Redis.client.sadd(key, ip.address(), Peers._handleErr(cb, 'getList failed', {
    key: key,
    org: process.env.ORG_ID,
    host: ip.address()
  }));
};

/**
 * wrap redis errors with boom
 * @param  {Function} cb       callback to call
 * @param  {Object}   message  additional message
 * @param  {Object}   errDebug additional data
 */
Peers._handleErr = function (cb, message, errDebug) {
  return function (err) {
    if (err) {
      log.error({ err: err }, '_handleErr error');
      errDebug.err = err;
      message = err.message ? message + ':' + err.message : message;
      return cb(error.createAndReport(502, message, errDebug));
    }

    log.trace({ arguments: arguments }, '_handleErr success');
    cb.apply(this, arguments);
  };
};