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

var Redis = require('../../../lib/models/redis.js');
var Peers = require('../../../lib/models/peers.js');

describe('peers.js unit test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_PEER_NAMESPACE = 'weave:peers';
    process.env.ORG_ID = 12348756;
    done();
  });
  describe('getList', function () {
    beforeEach(function (done) {
      Redis.client = {
        smembers: sinon.stub()
      };
      sinon.stub(Peers, '_handleErr');
      done();
    });

    afterEach(function (done) {
      Peers._handleErr.restore();
      done();
    });

    it('should list smembers', function (done) {
      var testList = ['Watcher', 'in', 'the', 'Water'];
      Redis.client.smembers.yieldsAsync(null, testList);
      Peers._handleErr.returnsArg(0);
      Peers.getList(function (err, peers) {
        expect(err).to.not.exist();
        expect(peers).to.deep.equal(testList);
        done();
      });
    });

    it('should error if smembers errors', function (done) {
      var testError = 'Shelob';
      Redis.client.smembers.yieldsAsync(testError);
      Peers._handleErr.returnsArg(0);
      Peers.getList(function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end getList

  describe('addSelf', function () {
    beforeEach(function (done) {
      Redis.client = {
        sadd: sinon.stub()
      };
      sinon.stub(Peers, '_handleErr');
      done();
    });

    afterEach(function (done) {
      Peers._handleErr.restore();
      done();
    });

    it('should list sadd', function (done) {
      var testList = ['Watcher', 'in', 'the', 'Water'];
      Redis.client.sadd.yieldsAsync(null, testList);
      Peers._handleErr.returnsArg(0);
      Peers.addSelf(function (err, peers) {
        expect(err).to.not.exist();
        expect(peers).to.deep.equal(testList);
        done();
      });
    });

    it('should error if sadd errors', function (done) {
      var testError = 'Shelob';
      Redis.client.sadd.yieldsAsync(testError);
      Peers._handleErr.returnsArg(0);
      Peers.addSelf(function (err) {
        expect(err).to.exist();
        done();
      });
    });
  }); // end addSelf

  describe('_handleErr', function () {
    it('should cb with args if not err', function (done) {
      var testData = 'Ungoliant';
      Peers._handleErr(function (err, data) {
        expect(err).to.not.exist();
        expect(data).to.equal(testData);
        done();
      })(null, testData);
    });

    it('should cb original error message', function (done) {
      var testError = { message: 'as takes longest to finish' };
      Peers._handleErr(function (err) {
        expect(err.message)
          .to.equal('Its the job thats never started:as takes longest to finish');
        done();
      }, 'Its the job thats never started', {})(testError);
    });

    it('should cb passed message', function (done) {
      var testError = 'never seen';
      Peers._handleErr(function (err) {
        expect(err.message)
          .to.equal('Roads Go Ever On');
        done();
      }, 'Roads Go Ever On', {})(testError);
    });
  }); // end _handleErr
}); // end peers.js unit test