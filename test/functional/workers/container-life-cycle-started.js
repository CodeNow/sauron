'use strict'
require('loadenv')()

var Code = require('code')
var fs = require('fs')
var Lab = require('lab')
var path = require('path')
var sinon = require('sinon')
var TaskFatalError = require('ponos').TaskFatalError;

var containerLifeCycleStarted = require('../../../lib/workers/container-life-cycle-started.js')
var RabbitMQ = require('../../../lib/models/rabbitmq.js')
var swarmInfo = require('../../fixtures/swarm-info-dynamic');
var Dockerode = require('dockerode')
var Swarmerode = require('swarmerode')
Dockerode = Swarmerode(Dockerode)

var lab = exports.lab = Lab.script()
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var describe = lab.describe
var expect = Code.expect
var it = lab.it

describe('container-life-cycle-started functional test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../../fixtures/weaveMock');
    RabbitMQ._publisher = {
      publish: sinon.stub()
    }
    sinon.stub(Dockerode.prototype, 'swarmHostExists')
    fs.unlink('./weaveMockArgs', function () {
      fs.unlink('./weaveEnvs', function () {
        done();
      });
    });
  })

  afterEach(function (done) {
    Dockerode.prototype.swarmHostExists.restore()
    delete process.env.WEAVE_PATH
    done()
  })

  describe('blacklisted container start', function () {
    it('should do nothing', function (done) {
      var testDockerUri = 'http://10.0.0.2:4242'
      var testOrgId = '12312312'
      var testJob = {
        id: '123',
        host: testDockerUri,
        from: process.env.NETWORK_BLACKLIST.split(',')[0],
        tags: testOrgId + ',build,run',
        inspectData: {
          Config: {
            ExposedPorts: [123]
          }
        }
      }
      containerLifeCycleStarted(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.notCalled(RabbitMQ._publisher.publish)
        sinon.assert.notCalled(Dockerode.prototype.swarmHostExists)

        try {
          fs.readFileSync('./weaveMockArgs');
        } catch (err) {
          return done()
        }

        done(new Error('weave not supposed to be called'))
      })
    })
  }) // end non-blacklisted container start

  describe('non-blacklisted container start', function () {
    describe('non-existing dock', function () {
      beforeEach(function (done) {
        Dockerode.prototype.swarmHostExists.yieldsAsync(null, false)
        done()
      })

      it('should fail fatally', function (done) {
        var testDockerUri = 'http://10.0.0.2:4242'
        var testJob = {
          id: '123',
          host: testDockerUri,
          from: 'ubuntu',
          tags: '223412,build,run',
          inspectData: {
            Config: {
              ExposedPorts: [123]
            }
          }
        }
        containerLifeCycleStarted(testJob).asCallback(function (err) {

          sinon.assert.calledOnce(Dockerode.prototype.swarmHostExists)
          sinon.assert.calledWith(Dockerode.prototype.swarmHostExists, '10.0.0.2:4242', sinon.match.func)
          sinon.assert.notCalled(RabbitMQ._publisher.publish)

          try {
            fs.readFileSync('./weaveMockArgs');
          } catch (err) {
            return done()
          }
          done(new Error('weave not supposed to be called'))
        })
      })
    }) // end non-existing dock

    describe('existing dock', function () {
      var testDockIp = '10.1.1.1'
      beforeEach(function (done) {
        Dockerode.prototype.swarmHostExists(null, true)
        done()
      })

      it('should publish network attached', function (done) {
        var testDockerUri = 'http://' + testDockIp + ':4242'
        var testJob = {
          id: '123',
          host: testDockerUri,
          from: 'ubuntu',
          tags: '1231,build,run',
          inspectData: {
            Config: {
              ExposedPorts: [123]
            }
          }
        }
        containerLifeCycleStarted(testJob).asCallback(function (err) {
          if (err) { return done(err) }

          sinon.assert.calledOnce(RabbitMQ._publisher.publish)
          sinon.assert.calledWith(RabbitMQ._publisher.publish, 'container.network.attached', testJob)
          done()
        })
      })

      it('should call weave attach', function (done) {
        var testDockerUri = 'http://' + testDockIp + ':4242'
        var testOrgId = '12312312'
        var testContainerId = '1232141252'
        var testJob = {
          id: testContainerId,
          host: testDockerUri,
          from: 'ubuntu',
          tags: testOrgId + ',build,run',
          inspectData: {
            Config: {
              ExposedPorts: [123]
            }
          }
        }

        containerLifeCycleStarted(testJob).asCallback(function (err) {
          if (err) { return done(err) }

          var weaveArgs = fs.readFileSync('./weaveMockArgs');
          var weaveEnvs = fs.readFileSync('./weaveEnvs');

          expect(weaveArgs.toString()).to.equal('attach ' + testContainerId + '\n');
          expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1');
          expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH);
          expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=' + testDockIp + ':4242');
          done()
        })
      })
    }) // end existing dock
  }) // blacklisted container starts
}) // end container-life-cycle-started functional test
