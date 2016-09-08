'use strict'
require('loadenv')()

const Lab = require('lab')
const sinon = require('sinon')

const containerLifeCycleDied = require('../../../lib/workers/container-life-cycle-died.js').task
const RabbitMQ = require('../../../lib/models/rabbitmq.js')

const lab = exports.lab = Lab.script()
const beforeEach = lab.beforeEach
const afterEach = lab.afterEach
const describe = lab.describe
const it = lab.it

describe('container-life-cycle-died functional test', function () {
  beforeEach(function (done) {
    sinon.stub(RabbitMQ, 'publishTask')
    done()
  })

  afterEach(function (done) {
    RabbitMQ.publishTask.restore()
    done()
  })

  describe('weave container death', function () {
    it('should publish weave start', function (done) {
      const testDockerUri = 'http://10.0.0.2:4242'
      const testOrgId = '12312312'
      const testJob = {
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

        sinon.assert.calledOnce(RabbitMQ.publishTask)
        sinon.assert.calledWith(RabbitMQ.publishTask, 'weave.start', {
          dockerUri: testDockerUri,
          orgId: testOrgId
        })
        done()
      })
    })
  }) // weave container death

  describe('non-weave container death', function () {
    it('should not publish weave start for non weave container', function (done) {
      const testDockerUri = 'http://10.0.0.2:4242'
      const testOrgId = '12312312'
      const testJob = {
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

        sinon.assert.notCalled(RabbitMQ.publishTask)
        done()
      })
    })
  }) // end non-weave container death
}) // end container-life-cycle-died functional test
