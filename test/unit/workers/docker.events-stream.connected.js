'use strict'
require('loadenv')()

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var Code = require('code')
var expect = Code.expect

var sinon = require('sinon')
const WorkerStopError = require('error-cat/errors/worker-stop-error')

var Events = require('../../../lib/models/events.js')
var RabbitMQ = require('../../../lib/models/rabbitmq.js')
var dockerEventsStreamConnected = require('../../../lib/workers/docker.events-stream.connected.js')

describe('docker.events-stream.connected.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMQ, 'publishWeaveStart')
      sinon.stub(Events, 'validateDockerJob')
      done()
    })

    afterEach(function (done) {
      RabbitMQ.publishWeaveStart.restore()
      Events.validateDockerJob.restore()
      done()
    })

    it('should throw error if invalid job', function (done) {
      Events.validateDockerJob.returns(false)
      dockerEventsStreamConnected({})
        .then(function () {
          throw new Error('should have thrown')
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(WorkerStopError)
          done()
        })
    })

    it('should throw error if publishWeaveStart throws', function (done) {
      Events.validateDockerJob.returns(true)
      RabbitMQ.publishWeaveStart.throws(new Error('test'))
      dockerEventsStreamConnected({})
        .then(function () {
          throw new Error('should have thrown')
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error)
          done()
        })
    })

    it('should be fine if no errors', function (done) {
      Events.validateDockerJob.returns(true)
      RabbitMQ.publishWeaveStart.returns()
      dockerEventsStreamConnected({
        host: 'testHost',
        tags: 'projectx,projecty,projectz'
      })
      .then(done)
      .catch(done)
    })
  }) // end run
}) // end docker.events-stream.connected unit test
