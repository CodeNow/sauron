'use strict';
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var error = require('../../lib/helpers/error.js');
var redis = require('../../lib/models/redis.js');
var rollbar = require('rollbar');

lab.experiment('/lib/models/redis.js unit test', function () {
  lab.experiment('error creation', function () {
    lab.test('error event should be thrown', function (done) {
      try {
        redis.emit('error', new Error('Redis is down'));
      } catch (err) {
        Lab.expect(err.message).to.equal('Redis error: Redis is down');
        done();
      }
    });
    lab.test('pubSub error event should be thrown', function (done) {
      try {
        redis.pubSub.emit('error', new Error('Redis is down'));
      } catch (err) {
        Lab.expect(err.message).to.equal('Redis error: Redis is down');
        done();
      }
    });
  });
});
