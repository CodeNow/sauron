'use strict'
require('loadenv')()

var Lab = require('lab')
var sinon = require('sinon')

var containerLifeCycleDied = require('../../../lib/workers/container-life-cycle-died.js')
var RabbitMQ = require('../../../lib/models/rabbitmq.js')

var lab = exports.lab = Lab.script()
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var describe = lab.describe
var it = lab.it

describe('container-life-cycle-died functional test', function () {
  beforeEach(function (done) {
    sinon.stub(RabbitMQ._publisher, 'publishTask')
    done()
  })

  afterEach(function (done) {
    RabbitMQ._publisher.publishTask.restore()
    done()
  })

  describe('weave container death', function () {
    it('should publish weave start', function (done) {
      var testDockerUri = 'http://10.0.0.2:4242'
      var testOrgId = '12312312'
      var testJob = {
        id: 123,
        host: testDockerUri,
        from: process.env.WEAVE_IMAGE_NAME,
        tags: testOrgId + ',build,run',
        inspectData: {
          Config: {
            ExposedPorts: [123]
          }
        }
      }
      containerLifeCycleDied(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.calledOnce(RabbitMQ._publisher.publishTask)
        sinon.assert.calledWith(RabbitMQ._publisher.publishTask, 'weave.start', {
          dockerUri: testDockerUri,
          orgId: testOrgId
        })
        done()
      })
    })
  }) // weave container death

  describe('non-weave container death', function () {
    it('should not publish weave start for non weave container', function (done) {
      var testDockerUri = 'http://10.0.0.2:4242'
      var testOrgId = '12312312'
      var testJob = {
        id: 123,
        host: testDockerUri,
        from: 'ubuntu',
        tags: testOrgId + ',build,run',
        inspectData: {
          Config: {
            ExposedPorts: [123]
          }
        }
      }
      containerLifeCycleDied(testJob).asCallback(function (err) {
        if (err) { return done(err) }

        sinon.assert.notCalled(RabbitMQ._publisher.publishTask)
        done()
      })
    })
  }) // end non-weave container death
}) // end container-life-cycle-died functional test
