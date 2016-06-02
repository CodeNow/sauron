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
var ponos = require('ponos')

var RabbitMQ = require('../../../lib/models/rabbitmq.js')
var WorkerServer = require('../../../lib/models/worker-server.js')

describe('WorkerServer unit test', function () {
  describe('listen', function () {
    beforeEach(function (done) {
      sinon.stub(RabbitMQ, 'getSubscriber')
      sinon.stub(ponos, 'Server')
      done()
    })

    afterEach(function (done) {
      ponos.Server.restore()
      RabbitMQ.getSubscriber.restore()
      done()
    })

    it('should start worker server', function (done) {
      RabbitMQ.getSubscriber.returns()
      ponos.Server.returns({
        setAllTasks: sinon.stub().returns(),
        start: sinon.stub().returnsThis(),
        then: sinon.stub().returnsThis().yieldsAsync(),
        catch: sinon.stub().returns()
      })
      WorkerServer.listen(function (err) {
        expect(WorkerServer._server.setAllTasks.calledOnce).to.be.true()
        expect(err).to.not.exist()
        done()
      })
    })

    it('should cb err if server failed', function (done) {
      RabbitMQ.getSubscriber.returns()
      ponos.Server.returns({
        setAllTasks: sinon.stub().returns(),
        start: sinon.stub().returnsThis(),
        then: sinon.stub().returnsThis(),
        catch: sinon.stub().returns().yieldsAsync('err')
      })
      WorkerServer.listen(function (err) {
        expect(err).to.exist()
        done()
      })
    })
  }) // end listen

  describe('stop', function () {
    beforeEach(function (done) {
      WorkerServer._server = {
        stop: sinon.stub(),
        then: sinon.stub(),
        catch: sinon.stub()
      }
      done()
    })

    afterEach(function (done) {
      delete WorkerServer._server
      done()
    })

    it('should start worker server', function (done) {
      WorkerServer._server.stop.returnsThis()
      WorkerServer._server.then.returnsThis().yieldsAsync()
      WorkerServer._server.catch.returnsThis()

      WorkerServer.stop(function (err) {
        expect(err).to.not.exist()
        done()
      })
    })

    it('should cb err if server failed', function (done) {
      WorkerServer._server.stop.returnsThis()
      WorkerServer._server.then.returnsThis()
      WorkerServer._server.catch.returnsThis().yieldsAsync('err')

      WorkerServer.stop(function (err) {
        expect(err).to.exist()
        done()
      })
    })
  }) // end stop
}) // end WorkerServer unit test
