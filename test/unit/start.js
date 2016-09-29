'use strict'

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const afterEach = lab.afterEach
const beforeEach = lab.beforeEach
const Code = require('code')
const expect = Code.expect

const Promise = require('bluebird')
const sinon = require('sinon')
require('sinon-as-promised')(Promise)

const Swarm = require('../../lib/models/swarm.js')
const RabbitMQ = require('../../lib/models/rabbitmq.js')
const Start = require('../../lib/start.js')
const WorkerServer = require('../../lib/models/worker-server.js')

describe('start.js unit test', function () {
  describe('startup', function () {
    beforeEach(function (done) {
      sinon.stub(WorkerServer, 'start')
      sinon.stub(RabbitMQ, 'connect')
      sinon.stub(RabbitMQ, 'publishWeaveStart')
      sinon.stub(Swarm, 'info')
      done()
    })

    afterEach(function (done) {
      WorkerServer.start.restore()
      RabbitMQ.publishWeaveStart.restore()
      RabbitMQ.connect.restore()
      Swarm.info.restore()
      done()
    })

    it('should startup on add docks', function (done) {
      var peers = [{
        Host: '10.0.0.1:4242',
        Labels: {
          size: 'large',
          org: 'codenow'
        }
      }, {
        Host: '10.0.0.2:4242',
        Labels: {
          size: 'large',
          org: 'other'
        }
      }]
      RabbitMQ.publishWeaveStart.returns()
      WorkerServer.start.resolves()
      RabbitMQ.connect.resolves()
      Swarm.info.resolves(peers)

      Start.startup(function (err) {
        if (err) { return done(err) }

        sinon.assert.calledTwice(RabbitMQ.publishWeaveStart)
        sinon.assert.calledWith(RabbitMQ.publishWeaveStart, {
          dockerUri: 'http://10.0.0.2:4242',
          orgId: 'other'
        })
        sinon.assert.calledWith(RabbitMQ.publishWeaveStart, {
          dockerUri: 'http://10.0.0.1:4242',
          orgId: 'codenow'
        })
        expect(WorkerServer.start.calledOnce).to.be.true()
        done()
      })
    })

    it('should throw an error if `Swarm.info` throws an error', function (done) {
      RabbitMQ.connect.resolves()
      RabbitMQ.publishWeaveStart.returns()
      WorkerServer.start.resolves()
      Swarm.info.rejects('err')

      Start.startup(function (err) {
        expect(err).to.exist()
        expect(RabbitMQ.publishWeaveStart.called).to.be.false()
        done()
      })
    })

    it('should throw an error if `WorkerServer.start` throws an error', function (done) {
      RabbitMQ.connect.resolves()
      WorkerServer.start.rejects('err')

      Start.startup(function (err) {
        expect(err).to.exist()
        expect(RabbitMQ.publishWeaveStart.called).to.be.false()
        done()
      })
    })

    it('should throw an error if `RabbitMQ.publishWeaveStart` throws an error', function (done) {
      var peers = [{
        dockerHost: '10.0.0.1:4242',
        Labels: [{ name: 'size', value: 'large' }, { name: 'org', value: 'codenow' }]
      }, {
        dockerHost: '10.0.0.2:4242',
        Labels: [{ name: 'size', value: 'large' }, { name: 'org', value: 'other' }]
      }]
      RabbitMQ.connect.resolves()
      RabbitMQ.publishWeaveStart.throws()
      WorkerServer.start.resolves()
      Swarm.info.resolves(peers)

      Start.startup(function (err) {
        expect(err).to.exist()
        sinon.assert.calledOnce(WorkerServer.start)
        sinon.assert.calledOnce(Swarm.info)
        sinon.assert.calledOnce(RabbitMQ.publishWeaveStart)
        done()
      })
    })
  }) // end startup

  describe('shutdown', function () {
    beforeEach(function (done) {
      sinon.stub(WorkerServer, 'stop')
      sinon.stub(RabbitMQ, 'disconnect')
      done()
    })

    afterEach(function (done) {
      WorkerServer.stop.restore()
      RabbitMQ.disconnect.restore()
      done()
    })

    it('should shutdown all services', function (done) {
      WorkerServer.stop.returns(Promise.resolve())
      RabbitMQ.disconnect.returns(Promise.resolve())

      Start.shutdown(function (err) {
        expect(err).to.not.exist()
        expect(WorkerServer.stop.calledOnce).to.be.true()
        expect(RabbitMQ.disconnect.calledOnce).to.be.true()
        done()
      })
    })

    it('should throw an error if `WorkerServer` failed', function (done) {
      var errMessage = 'WorkerServer error'
      WorkerServer.stop.returns(Promise.reject(new Error(errMessage)))

      Start.shutdown(function (err) {
        expect(err).to.exist()
        expect(err).to.be.an.instanceof(Error)
        expect(err.message).to.equal(errMessage)
        done()
      })
    })

    it('should throw an error if `RabbitMQ.disconnect` failed', function (done) {
      var errMessage = 'RabbitMQ.disconnect error'
      WorkerServer.stop.returns(Promise.resolve())
      RabbitMQ.disconnect.returns(Promise.reject(new Error(errMessage)))

      Start.shutdown(function (err) {
        expect(err).to.be.an.instanceof(Error)
        expect(err.message).to.equal(errMessage)
        done()
      })
    })
  }) // end shutdown
}) // end start.js unit test
