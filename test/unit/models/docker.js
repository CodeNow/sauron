
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
var SwarmInfo = require('../../fixtures/swarm-info');

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

  describe('doesDockExist', function () {
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

      Docker.doesDockExist('8.8.8.8:4242', function (err) {
        expect(err).to.equal(testError);
        sinon.assert.calledOnce(Dockerode.prototype.info)
        sinon.assert.calledWith(Dockerode.prototype.info, sinon.match.func)
        done();
      });
    });

    it('should cb true if dock in list', function (done) {
      Dockerode.prototype.info.yieldsAsync(null, {
        DriverStatus: [
          ['yellowjacket', 'mosquito'],
          ['flea', 'ladybug'],
          ['ip-10-1-1-1', '10.0.0.1:4242'],
        ]
      });

      Docker.doesDockExist('10.0.0.1:4242', function (err, exists) {
        expect(err).to.not.exist()
        expect(exists).to.be.true()
        sinon.assert.calledOnce(Dockerode.prototype.info)
        sinon.assert.calledWith(Dockerode.prototype.info, sinon.match.func)
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

      Docker.doesDockExist('10.0.0.2:4242', function (err, exists) {
        if (err) { return done(err); }
        expect(exists).to.be.false()
        sinon.assert.calledOnce(Dockerode.prototype.info)
        sinon.assert.calledWith(Dockerode.prototype.info, sinon.match.func)
        done();
      });
    });
  }); // end doesDockExist

  describe('_parseSwarmInfo', function () {
    it('should parse fixture data', function (done) {
      var nodes = Docker._parseSwarmInfo(SwarmInfo)
      expect(nodes.length).to.equal(61)
      var firstNode = nodes[0]
      expect(firstNode['Containers']).to.equal('13')
      expect(firstNode['Reserved CPUs']).to.equal('0 / 2')
      expect(firstNode['Reserved Memory']).to.equal('5.245 GiB / 8.187 GiB')
      expect(firstNode['Status']).to.equal('Healthy')
      expect(firstNode['dockerHost']).to.equal('10.8.192.11:4242')
      expect(firstNode['Labels'].length).to.equal(5)
      expect(firstNode['Labels'][0].name).to.equal('executiondriver')
      expect(firstNode['Labels'][0].value).to.equal('native-0.2')
      expect(firstNode['Labels'][3].name).to.equal('org')
      expect(firstNode['Labels'][3].value).to.equal('445457')
      var lastNode = nodes[60]
      expect(lastNode['Containers']).to.equal('2')
      expect(lastNode['Reserved CPUs']).to.equal('0 / 2')
      expect(lastNode['Reserved Memory']).to.equal('0 B / 8.187 GiB')
      expect(lastNode['Status']).to.equal('Healthy')
      expect(lastNode['dockerHost']).to.equal('10.8.223.224:4242')
      expect(lastNode['Labels'].length).to.equal(5)
      expect(lastNode['Labels'][0].name).to.equal('executiondriver')
      expect(lastNode['Labels'][0].value).to.equal('native-0.2')
      expect(lastNode['Labels'][3].name).to.equal('org')
      expect(lastNode['Labels'][3].value).to.equal('1529064')
      done()
    })
  })
});
