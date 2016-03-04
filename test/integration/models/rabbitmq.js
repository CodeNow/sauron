'use strict'
require('loadenv')()

var Code = require('code')
var Hermes = require('runnable-hermes')
var Lab = require('lab')
var sinon = require('sinon')

var RabbitMQ = require('../../../lib/models/rabbitmq.js')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var expect = Code.expect

var subscribedEvents = [
  'container.network.attached'
]

var subscribeQueues = [
  'weave.start',
  'weave.peer.forget'
]

var testSubscriber = new Hermes({
  hostname: process.env.RABBITMQ_HOSTNAME,
  password: process.env.RABBITMQ_PASSWORD,
  port: process.env.RABBITMQ_PORT,
  username: process.env.RABBITMQ_USERNAME,
  subscribedEvents: subscribedEvents,
  queues: subscribeQueues,
  name: 'testSubscriber'
})

describe('rabbitmq integration test', function () {
  beforeEach(function (done) {
    RabbitMQ.create()
    RabbitMQ._publisher.on('ready', done)
  })

  beforeEach(function (done) {
    testSubscriber.connect(done)
  })

  afterEach(function (done) {
    RabbitMQ.disconnectPublisher(done)
  })

  afterEach(function (done) {
    testSubscriber.close(done)
  })

  describe('check publishing', function () {
    it('should publish container.network.attached job', function (done) {
      var testJob = {
        id: 1234,
        inspectData: 'one',
        containerIp: 'two'
      }

      testSubscriber.subscribe('container.network.attached', function (data, cb) {
        expect(data).to.deep.equal(testJob)
        cb()
        done()
      })

      RabbitMQ.publishContainerNetworkAttached(testJob)
    })
  }) // end publishContainerNetworkAttached
}) // end rabbitmq integration test