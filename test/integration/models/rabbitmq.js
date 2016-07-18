'use strict'
require('loadenv')()

var Code = require('code')
var Lab = require('lab')
var ponos = require('ponos')
var Promise = require('bluebird')

var RabbitMQ = require('../../../lib/models/rabbitmq.js')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var expect = Code.expect

var testWorker

const testServer = new ponos.Server({
  name: process.env.APP_NAME,
  rabbitmq: {
    hostname: process.env.RABBITMQ_HOSTNAME,
    port: process.env.RABBITMQ_PORT,
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD
  },
  events: {
    'container.network.attached': function (data) {
      return Promise.try(() => {
        return testWorker(data)
      })
    }
  }
})

describe('rabbitmq integration test', function () {
  beforeEach(function (done) {
    RabbitMQ.create().asCallback(done)
  })

  beforeEach(function (done) {
    testServer.start().asCallback(done)
  })

  afterEach(function (done) {
    RabbitMQ.disconnect().asCallback(done)
  })

  afterEach(function (done) {
    testServer.stop().asCallback(done)
  })

  describe('check publishing', function () {
    it('should publish container.network.attached job', function (done) {
      var testJob = {
        id: 1234,
        inspectData: 'one',
        containerIp: 'two'
      }

      testWorker = (data) => {
        return Promise.try(() => {
          expect(data).to.equal(testJob)
          done()
        })
      }

      RabbitMQ.publishContainerNetworkAttached(testJob)
    })
  }) // end publishContainerNetworkAttached
}) // end rabbitmq integration test
