
'use strict';

require('loadenv')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var expect = Code.expect;

var Dockerode = require('dockerode');
var sinon = require('sinon');

var Docker = require('../../../lib/models/docker.js');

describe('lib/models/docker unit test', function () {
  describe('loadCerts', function () {
    it('should throw if missing certs', function (done) {
      process.env.DOCKER_CERT_PATH = 'fake/path';

      expect(Docker.loadCerts).to.throw();
      done();
    });

    it('should load certs', function (done) {
      process.env.DOCKER_CERT_PATH = './test/fixtures/certs';

      expect(Docker.loadCerts).to.not.throw();
      done();
    });
  }); // end loadCerts

  describe('ensureDockRemoved', function () {
    beforeEach(function (done) {
      sinon.stub(Dockerode.prototype, 'info');
      done();
    });

    afterEach(function (done) {
      Dockerode.prototype.info.restore();
      done();
    });

    it('should cb swarm error', function (done) {
      var testError = new Error('bee');
      Dockerode.prototype.info.yieldsAsync(testError);

      Docker.ensureDockRemoved('http://8.8.8.8:4242', function (err) {
        expect(err).to.equal(testError);
        sinon.assert.calledOnce(Dockerode.prototype.info);

        done();
      });
    });

    it('should cb error if dock in list', function (done) {
      Dockerode.prototype.info.yieldsAsync(null, {
        DriverStatus: [
          ['yellowjacket', 'mosquito'],
          ['flea', 'ladybug'],
          ['ip-10-1-1-1', '10.0.0.1:4242'],
        ]
      });

      Docker.ensureDockRemoved('http://10.0.0.1:4242', function (err) {
        expect(err.output.statusCode).to.equal(412);
        sinon.assert.calledOnce(Dockerode.prototype.info);

        done();
      });
    });

    it('should cb with null if dock not in list', function (done) {
      Dockerode.prototype.info.yieldsAsync(null, {
        DriverStatus: [
          ['yellowjacket', 'mosquito'],
          ['flea', 'ladybug'],
          ['ip-10-1-1-1', '10.0.0.1:4242'],
        ]
      });

      Docker.ensureDockRemoved('http://10.0.0.2:4242', function (err) {
        if (err) { return done(err); }
        sinon.assert.calledOnce(Dockerode.prototype.info);

        done();
      });
    });
  }); // end ensureDockRemoved
});
