'use strict'
require('loadenv')()

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const Code = require('code')
const expect = Code.expect

const sinon = require('sinon')
require('sinon-as-promised')(require('bluebird'))
const RabbitMQ = require('../../../lib/models/rabbitmq.js')
const dockerEventsStreamConnected = require('../../../lib/workers/docker.events-stream.connected.js').task

describe('docker.events-stream.connected.js unit test', function () {
  describe('run', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMQ, 'publishWeaveStart')
      done()
    })

    afterEach(function (done) {
      RabbitMQ.publishWeaveStart.restore()
      done()
    })

    it('should throw error if publishWeaveStart throws', function (done) {
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
      RabbitMQ.publishWeaveStart.returns()
      dockerEventsStreamConnected({
        host: 'testHost',
        tags: 'projectx,projecty,projectz'
      })
      .asCallback(done)
    })
  }) // end run
}) // end docker.events-stream.connected unit test
