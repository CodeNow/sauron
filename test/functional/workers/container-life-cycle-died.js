'use strict'
require('loadenv')()

var Code = require('code')
var Lab = require('lab')
var sinon = require('sinon')

var containerLifeCycleDied = require('../../../lib/workers/container-life-cycle-died.js')
var RabbitMQ = require('../../../lib/models/rabbitmq.js')

var lab = exports.lab = Lab.script()
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var describe = lab.describe
var expect = Code.expect
var it = lab.it

describe('container-life-cycle-died functional test', function () {
  beforeEach(function (done) {
    RabbitMQ._publisher = {
      publish: sinon.stub()
    }
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

        sinon.assert.calledOnce(RabbitMQ._publisher.publish)
        sinon.assert.calledWith(RabbitMQ._publisher.publish, 'weave.start', {
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

        sinon.assert.notCalled(RabbitMQ._publisher.publish)
        done()
      })
    })
  }) // end non-weave container death
}) // end container-life-cycle-died functional test