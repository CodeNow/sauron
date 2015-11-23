'use strict';

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var expect = Code.expect;

var sinon = require('sinon');
var request = require('request');

var Peers = require('../../../lib/models/peers.js');

describe('peers.js unit test', function () {
  beforeEach(function (done) {
    process.env.ORG_ID = 12348756;
    done();
  });
  describe('getList', function () {
    beforeEach(function (done) {
      sinon.stub(request, 'get');
      done();
    });

    afterEach(function (done) {
      request.get.restore();
      done();
    });

    it('should error is request errored', function (done) {
      request.get.yieldsAsync('firestone');
      Peers.getList('', function (err) {
        expect(err.output.statusCode).to.equal(502);
        done();
      });
    });

    it('should error is request returncode != 200', function (done) {
      request.get.yieldsAsync(null, {
        statusCode: 500
      });
      Peers.getList('', function (err) {
        expect(err.output.statusCode).to.equal(500);
        done();
      });
    });

    it('should return correct hosts based on org', function (done) {
      var testData = [{tags: 'runnable,build,run', host: 'http://host1:4242'},
        {tags: 'runnable,build,run', host: 'http://host2:4242'},
        {tags: 'codenow,build,run', host: 'http://host3:4242'}];
      request.get.yieldsAsync(null, {
        statusCode: 200
      }, JSON.stringify(testData));
      Peers.getList('runnable', function (err, peers) {
        expect(err).to.not.exist();
        expect(peers).to.contain(['host1', 'host2']);
        done();
      });
    });

    it('should return no hosts', function (done) {
      var testData = [{tags: 'runnable,build,run', host: 'http://host1:4242'},
        {tags: 'runnable,build,run', host: 'http://host2:4242'},
        {tags: 'codenow,build,run', host: 'http://host3:4242'}];
      request.get.yieldsAsync(null, {
        statusCode: 200
      }, JSON.stringify(testData));
      Peers.getList('blue', function (err, peers) {
        expect(err).to.not.exist();
        expect(peers).to.be.empty();
        done();
      });
    });
  }); // end getList
}); // end peers.js unit test
