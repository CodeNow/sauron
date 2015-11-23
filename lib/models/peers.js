'use strict';
require('loadenv')();

var ErrorCat = require('error-cat');
var error = new ErrorCat();
var request = require('request');
var url = require('url');

var log = require('../logger.js')();

module.exports = Peers;

/**
 * Module used to keep track of weave network peers
 */
function Peers () { }

/**
 * get array of routers for a specific org
 * @param  {Function} cb (err, [peers])
 *                       peers can be empty array
 */
Peers.getList = function (org, cb) {
  log.info({org: org}, 'getList');
  request.get(process.env.MAVIS_URL + '/docks', function (err, res, body) {
    log.trace({ body: body }, 'response from mavis');
    if (err || res.statusCode !== 200) {
      return cb(error.createAndReport(err ? 502 : res.statusCode, 'getting docks failed', err));
    }
    var docks = JSON.parse(body);
    var hostnames = docks.filter(function (item) {
      return ~item.tags.indexOf(org);
    }).map(function (item) {
      return url.parse(item.host).hostname;
    });

    cb(null, hostnames);
  });
};
