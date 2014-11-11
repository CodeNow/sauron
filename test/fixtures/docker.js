'use strict';
require('../../lib/loadenv.js')();
var Dockerode = require('dockerode');
var app = require('docker-mock');

var server = null;
module.exports.start = function (cb) {
  server = app.listen(process.env.DOCKER_TEST_PORT, cb);
};
module.exports.stop = function (cb) {
  server.close(cb);
};

module.exports.client = new Dockerode({
  host: 'http://localhost',
  port: process.env.DOCKER_TEST_PORT
});