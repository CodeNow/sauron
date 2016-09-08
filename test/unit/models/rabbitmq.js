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

var RabbitMQ = require('../../../lib/models/rabbitmq.js')

describe('rabbitmq.js unit test', function () {
  beforeEach(function (done) {
    process.env.RABBITMQ_HOSTNAME = 'Goblins'
    process.env.RABBITMQ_PASSWORD = 'Orcs'
    process.env.RABBITMQ_PORT = '1738'
    process.env.RABBITMQ_USERNAME = 'Azog'
    sinon.stub(RabbitMQ, 'publishTask')
    sinon.stub(RabbitMQ, 'publishEvent')
    done()
  })

  afterEach(function (done) {
    delete process.env.RABBITMQ_HOSTNAME
    delete process.env.RABBITMQ_PASSWORD
    delete process.env.RABBITMQ_PORT
    delete process.env.RABBITMQ_USERNAME
    RabbitMQ.publishTask.restore()
    RabbitMQ.publishEvent.restore()
    done()
  })

  describe('publishContainerNetworkAttached', function () {
    it('should call publish with correct key and data', function (done) {
      RabbitMQ.publishEvent.returns()

      var data = {
        containerIp: '10.0.0.2',
        host: 'http://localhost:4242',
        id: '237c9ccf14e89a6e23fb15f2d9132efd98878f6267b9f128f603be3b3e362472',
        from: 'weaveworks/weave:1.2.0',
        inspectData: {
          Config: {
            ExposedPorts: {
              '6783/tcp': {},
              '6783/udp': {}
            }
          }
        }
      }
      RabbitMQ.publishContainerNetworkAttached(data)
      expect(RabbitMQ.publishEvent.withArgs('container.network.attached')
        .calledOnce).to.be.true()
      expect(Object.keys(RabbitMQ.publishEvent.args[0][1]))
        .to.contain(['id', 'inspectData', 'containerIp'])
      done()
    })
  }) // end publishContainerNetworkAttached

  describe('publishWeaveStart', function () {
    it('should publish _publisher', function (done) {
      RabbitMQ.publishTask.returns()
      var testArgs = {
        dockerUri: 'http://10.0.0.1:4242',
        orgId: 'runnable'
      }
      RabbitMQ.publishWeaveStart(testArgs)

      expect(RabbitMQ.publishTask
        .withArgs('weave.start', testArgs).called).to.be.true()
      done()
    })
  }) // end publishWeaveStart

  describe('publishWeaveKill', function () {
    it('should publish _publisher', function (done) {
      RabbitMQ.publishTask.returns()
      var testArgs = {
        containerId: 'id-1'
      }
      RabbitMQ.publishWeaveKill(testArgs)

      expect(RabbitMQ.publishTask
        .withArgs('weave.kill', testArgs).called).to.be.true()
      done()
    })
  }) // end publishWeaveKill

  describe('publishWeavePeerForget', function () {
    it('should publish _publisher', function (done) {
      RabbitMQ.publishTask.returns()
      var testArgs = {
        dockerHost: '10.0.0.1:4242',
        hostname: '10.0.0.99'
      }
      RabbitMQ.publishWeavePeerForget(testArgs)

      expect(RabbitMQ.publishTask
        .withArgs('weave.peer.forget', testArgs).called).to.be.true()
      done()
    })
  }) // end publishWeavePeerForget

  describe('publishWeavePeerRemove', function () {
    it('should publish _publisher', function (done) {
      RabbitMQ.publishTask.returns()
      var testArgs = {
        dockerHost: '10.0.0.1:4242',
        hostname: '10.0.0.99',
        orgId: '201512'
      }
      RabbitMQ.publishWeavePeerRemove(testArgs)

      expect(RabbitMQ.publishTask
        .withArgs('weave.peer.remove', testArgs).called).to.be.true()
      done()
    })
  }) // end publishWeavePeerRemove

  describe('publishDockLost', function () {
    it('should publish dock.lost', function (done) {
      const testData = {
        host: 'testHost'
      }
      RabbitMQ.publishTask.returns()
      RabbitMQ.publishDockLost(testData)
      expect(RabbitMQ.publishTask.withArgs('dock.lost').called).to.be.true()
      expect(RabbitMQ.publishTask.args[0][1].host).to.equal(testData.host)
      done()
    })
  }) // end publishDockLost
}) // end rabbitmq.js unit test
