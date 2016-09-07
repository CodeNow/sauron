'use strict'
require('loadenv')()

const Code = require('code')
const Lab = require('lab')
const ponos = require('ponos')
const Promise = require('bluebird')

const RabbitMQ = require('../../../lib/models/rabbitmq.js')

const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const expect = Code.expect

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
    RabbitMQ.connect().asCallback(done)
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
      const testJob = {
        id: '1234',
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
