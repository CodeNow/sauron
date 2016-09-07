'use strict'
require('loadenv')()

const Code = require('code')
const fs = require('fs')
const Lab = require('lab')
const path = require('path')
const sinon = require('sinon')
const Promise = require('bluebird')
require('sinon-as-promised')(Promise)

const containerLifeCycleStarted = require('../../../lib/workers/container-life-cycle-started.js').task
const RabbitMQ = require('../../../lib/models/rabbitmq.js')
const Docker = require('../../../lib/models/docker')

const lab = exports.lab = Lab.script()
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const describe = lab.describe
const expect = Code.expect
const it = lab.it

describe('container-life-cycle-started functional test', function () {
  beforeEach(function (done) {
    process.env.WEAVE_PATH = path.resolve(__dirname, '../../fixtures/weaveMock')
    sinon.stub(Docker, 'doesDockExist')
    sinon.stub(RabbitMQ, 'publishContainerNetworkAttached')
    fs.unlink('./weaveMockArgs', function () {
      fs.unlink('./weaveEnvs', function () {
        done()
      })
    })
  })

  afterEach(function (done) {
    Docker.doesDockExist.restore()
    RabbitMQ.publishContainerNetworkAttached.restore()
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

        sinon.assert.notCalled(RabbitMQ.publishContainerNetworkAttached)
        sinon.assert.notCalled(Docker.doesDockExist)

        try {
          fs.readFileSync('./weaveMockArgs')
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
        Docker.doesDockExist.resolves(false)
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
        containerLifeCycleStarted(testJob).asCallback(function () {
          sinon.assert.calledOnce(Docker.doesDockExist)
          sinon.assert.calledWith(Docker.doesDockExist, '10.0.0.2:4242')
          sinon.assert.notCalled(RabbitMQ.publishContainerNetworkAttached)

          try {
            fs.readFileSync('./weaveMockArgs')
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
        Docker.doesDockExist.resolves(true)
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

          sinon.assert.calledOnce(RabbitMQ.publishContainerNetworkAttached)
          sinon.assert.calledWith(RabbitMQ.publishContainerNetworkAttached, testJob)
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

          var weaveArgs = fs.readFileSync('./weaveMockArgs')
          var weaveEnvs = fs.readFileSync('./weaveEnvs')

          expect(weaveArgs.toString()).to.equal('attach ' + testContainerId + '\n')
          expect(weaveEnvs.toString()).to.contain('DOCKER_TLS_VERIFY=1')
          expect(weaveEnvs.toString()).to.contain('DOCKER_CERT_PATH=' + process.env.DOCKER_CERT_PATH)
          expect(weaveEnvs.toString()).to.contain('DOCKER_HOST=' + testDockIp + ':4242')
          done()
        })
      })
    }) // end existing dock
  }) // blacklisted container starts
}) // end container-life-cycle-started functional test
