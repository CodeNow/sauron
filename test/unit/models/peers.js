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

    it('should error is request err', function (done) {
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
      var testData = [
        {tags: 'runnable,build,run', host: 'http://host1:4242'},
        {tags: 'runnable,build,run', host: 'http://host2:4242'},
        {tags: 'codenow,build,run', host: 'http://host3:4242'}
      ];
      request.get.yieldsAsync(null, {
        statusCode: 200
      }, JSON.stringify(testData));

      Peers.getList('runnable', function (err, peers) {
        expect(err).to.not.exist();
        expect(peers).to.deep.contain({
          dockerUri: 'http://host1:4242',
          orgId: 'runnable'
        });
        expect(peers).to.deep.contain({
          dockerUri: 'http://host2:4242',
          orgId: 'runnable'
        });
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

  describe('doesDockExist', function () {
    beforeEach(function (done) {
      sinon.stub(Peers, 'getList');
      done();
    });

    afterEach(function (done) {
      Peers.getList.restore();
      done();
    });

    it('should cb error if getList failed', function (done) {
      var error = new Error('Gandalf');
      Peers.getList.yieldsAsync(error);

      Peers.doesDockExist('', function (err) {
        expect(err).to.equal(error);
        done();
      });
    });

    it('should cb false if getList returns empty', function (done) {
      Peers.getList.yieldsAsync(null, []);

      Peers.doesDockExist('', function (err, doesExist) {
        expect(doesExist).to.be.false();
        done();
      });
    });

    it('should cb false if dock not in list', function (done) {
      Peers.getList.yieldsAsync(null, [{
        dockerUri: 'fake'
      }]);

      Peers.doesDockExist('notMe', function (err, doesExist) {
        expect(doesExist).to.be.false();
        done();
      });
    });

    it('should cb true if dock not in list', function (done) {
      Peers.getList.yieldsAsync(null, [{
        dockerUri: 'here'
      }, {
        dockerUri: '1'
      }]);

      Peers.doesDockExist('here', function (err, doesExist) {
        expect(doesExist).to.be.true();
        done();
      });
    });
  }); // end doesDockExist
}); // end peers.js unit test
