
'use strict';

require('loadenv')();

var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var afterEach = lab.afterEach;
var beforeEach = lab.beforeEach;
var Code = require('code');
var miss = require('mississippi')
var expect = Code.expect;

var Dockerode = require('dockerode');
var sinon = require('sinon');

var Docker = require('../../../lib/models/docker.js')
var SwarmInfo = require('../../fixtures/swarm-info')
var SwarmInfoWithQuestionMarks = require('../../fixtures/swarm-info-question-marks')

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
        SystemStatus: [
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
        SystemStatus: [
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
      expect(firstNode['Containers']).to.equal(13)
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
      expect(lastNode['Containers']).to.equal(2)
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
    it('should parse fixture data with questions marks in the fields', function (done) {
      var nodes = Docker._parseSwarmInfo(SwarmInfoWithQuestionMarks)
      expect(nodes.length).to.equal(61)
      var firstNode = nodes[0]
      expect(firstNode['Containers']).to.equal(13)
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
      expect(lastNode['Containers']).to.equal(2)
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
  describe('_findDocksByOrgId', function () {
    it('should find 3 docks for an org', function (done) {
      var nodes = Docker._parseSwarmInfo(SwarmInfo)
      expect(nodes.length).to.equal(61)
      var orgDocks = Docker._findDocksByOrgId(nodes, '4643352')
      expect(orgDocks.length).to.equal(3)
      done()
    })
    it('should return [] if no docks were found', function (done) {
      var nodes = Docker._parseSwarmInfo(SwarmInfo)
      expect(nodes.length).to.equal(61)
      var orgDocks = Docker._findDocksByOrgId(nodes, '1111111')
      expect(orgDocks.length).to.equal(0)
      done()
    })
    it('should return [] if no doc has no labels', function (done) {
      var nodes = Docker._parseSwarmInfo(SwarmInfo)
      expect(nodes.length).to.equal(61)
      delete nodes[0].Labels
      var orgDocks = Docker._findDocksByOrgId(nodes, '445457')
      expect(orgDocks.length).to.equal(0)
      done()
    })
  })

  describe('findDocksByOrgId', function () {
    beforeEach(function (done) {
      sinon.stub(Docker, 'info')
      sinon.stub(Docker, '_findDocksByOrgId')
      done();
    });

    afterEach(function (done) {
      Docker.info.restore();
      Docker._findDocksByOrgId.restore();
      done();
    });

    it('should cb swarm error', function (done) {
      var testError = new Error('bee');
      Docker.info.yieldsAsync(testError);

      Docker.findDocksByOrgId('4643352', function (err) {
        expect(err).to.equal(testError);
        sinon.assert.calledOnce(Docker.info)
        sinon.assert.calledWith(Docker.info, sinon.match.func)
        done();
      });
    });

    it('should cb with nodes', function (done) {
      var testDocks = [1, 2];
      var testInfo = ['a', 'b'];
      var testOrgId = '4643352';

      Docker.info.yieldsAsync(null, testInfo);
      Docker._findDocksByOrgId.returns(testDocks);

      Docker.findDocksByOrgId(testOrgId, function (err, docks) {
        if (err) { return done(err) }

        expect(docks).to.deep.equal(testDocks)

        sinon.assert.calledOnce(Docker.info)
        sinon.assert.calledWith(Docker.info, sinon.match.func)

        sinon.assert.calledOnce(Docker._findDocksByOrgId)
        sinon.assert.calledWith(Docker._findDocksByOrgId, testInfo, testOrgId)
        done();
      });
    });
  });

  describe('findLightestOrgDock', function () {
    beforeEach(function (done) {
      sinon.stub(Docker, 'findDocksByOrgId')
      done();
    });

    afterEach(function (done) {
      Docker.findDocksByOrgId.restore();
      done();
    });

    it('should cb swarm error', function (done) {
      var testError = new Error('bee');
      var testOrgId = '4643352';

      Docker.findDocksByOrgId.yieldsAsync(testError);

      Docker.findLightestOrgDock(testOrgId, function (err) {
        expect(err).to.equal(testError);
        sinon.assert.calledOnce(Docker.findDocksByOrgId)
        sinon.assert.calledWith(Docker.findDocksByOrgId, testOrgId, sinon.match.func)
        done();
      });
    });

    it('should with the lightest node', function (done) {
      var testOrgId = '4643352';

      Docker.findDocksByOrgId.yieldsAsync(null, [{
        Containers: 5
      }, {
        Containers: 10
      }]);

      Docker.findLightestOrgDock(testOrgId, function (err, dock) {
        if (err) { return done(err) }
        expect(dock.Containers).to.equal(5)
        sinon.assert.calledOnce(Docker.findDocksByOrgId)
        sinon.assert.calledWith(Docker.findDocksByOrgId, testOrgId, sinon.match.func)
        done();
      });
    });

    it('should cb with null if no nodes found for an org', function (done) {
      var testOrgId = '111111';

      Docker.findDocksByOrgId.yieldsAsync(null, []);

      Docker.findLightestOrgDock(testOrgId, function (err, dock) {
        if (err) { return done(err) }
        expect(dock).to.not.exist()
        sinon.assert.calledOnce(Docker.findDocksByOrgId)
        sinon.assert.calledWith(Docker.findDocksByOrgId, testOrgId, sinon.match.func)
        done();
      });
    });
  });

  describe('info', function () {
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

      Docker.info(function (err) {
        expect(err).to.equal(testError);
        sinon.assert.calledOnce(Dockerode.prototype.info)
        sinon.assert.calledWith(Dockerode.prototype.info, sinon.match.func)
        done();
      });
    });

    it('should cb with the list of all docks', function (done) {
      Dockerode.prototype.info.yieldsAsync(null, SwarmInfo);

      Docker.info(function (err, docks) {
        expect(err).to.not.exist()
        expect(docks.length).to.equal(61)
        sinon.assert.calledOnce(Dockerode.prototype.info)
        sinon.assert.calledWith(Dockerode.prototype.info, sinon.match.func)
        done();
      });
    });
  });

  describe('getLogs', function () {
    var containerStub
    beforeEach(function (done) {
      var logsStream = function (string) {
        return miss.from(function(size, next) {
          // if there's no more content
          // left in the string, close the stream.
          if (string.length <= 0) return next(null, null)

          // Pull in a new chunk of text,
          // removing it from the string.
          var chunk = string.slice(0, size)
          string = string.slice(size)

          // Emit "chunk" from the stream.
          next(null, chunk)
        })
      }
      containerStub = {
        logs: function () {}
      }
      sinon.stub(containerStub, 'logs').yieldsAsync(null, logsStream('some weave logs'))
      sinon.stub(Dockerode.prototype, 'getContainer').returns(containerStub)
      done()
    })
    afterEach(function (done) {
      Dockerode.prototype.getContainer.restore()
      done()
    })
    it('should call getLogs with correct options', function (done) {
      Docker.getLogs('container-id', function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledOnce(Dockerode.prototype.getContainer)
        sinon.assert.calledWith(Dockerode.prototype.getContainer, 'container-id')
        sinon.assert.calledOnce(containerStub.logs)
        sinon.assert.calledWith(containerStub.logs, {
          stdout: true,
          stderr: true
        })
        done()
      })
    })
    it('should fail if logs call failed', function (done) {
      var dockerError = new Error('Docker error')
      containerStub.logs.yieldsAsync(dockerError)
      Docker.getLogs('container-id', function (err) {
        expect(err).to.equal(dockerError)
        sinon.assert.calledOnce(Dockerode.prototype.getContainer)
        sinon.assert.calledWith(Dockerode.prototype.getContainer, 'container-id')
        sinon.assert.calledOnce(containerStub.logs)
        sinon.assert.calledWith(containerStub.logs, {
          stdout: true,
          stderr: true
        })
        done()
      })
    })
    it('should fail if logs stream failed', function (done) {
      var dockerError = new Error('Docker error')
      var logsStream = function (string) {
        return miss.from(function(size, next) {
          next(dockerError)
        })
      }
      containerStub.logs.yieldsAsync(null, logsStream('some weave logs'))
      Docker.getLogs('container-id', function (err) {
        expect(err).to.equal(dockerError)
        sinon.assert.calledOnce(Dockerode.prototype.getContainer)
        sinon.assert.calledWith(Dockerode.prototype.getContainer, 'container-id')
        sinon.assert.calledOnce(containerStub.logs)
        sinon.assert.calledWith(containerStub.logs, {
          stdout: true,
          stderr: true
        })
        done()
      })
    })
  })

  describe('killContainer', function () {
    var containerStub
    beforeEach(function (done) {
      containerStub = {
        kill: function () {}
      }
      sinon.stub(containerStub, 'kill').yieldsAsync()
      sinon.stub(Dockerode.prototype, 'getContainer').returns(containerStub)
      done()
    })
    afterEach(function (done) {
      Dockerode.prototype.getContainer.restore()
      done()
    })
    it('should call kill with correct options', function (done) {
      Docker.killContainer('container-id', function (err) {
        expect(err).to.not.exist()
        sinon.assert.calledOnce(Dockerode.prototype.getContainer)
        sinon.assert.calledWith(Dockerode.prototype.getContainer, 'container-id')
        sinon.assert.calledOnce(containerStub.kill)
        done()
      })
    })
    it('should fail if logs call failed', function (done) {
      var dockerError = new Error('Docker error')
      containerStub.kill.yieldsAsync(dockerError)
      Docker.killContainer('container-id', function (err) {
        expect(err).to.equal(dockerError)
        sinon.assert.calledOnce(Dockerode.prototype.getContainer)
        sinon.assert.calledWith(Dockerode.prototype.getContainer, 'container-id')
        sinon.assert.calledOnce(containerStub.kill)
        done()
      })
    })
  })
});
