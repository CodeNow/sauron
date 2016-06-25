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
const ponos = require('ponos')
const Promise = require('bluebird')

const WorkerServer = require('../../../lib/models/worker-server.js')

describe('WorkerServer unit test', function () {
  describe('listen', function () {
    beforeEach(function (done) {
      sinon.stub(ponos, 'Server')
      done()
    })

    afterEach(function (done) {
      ponos.Server.restore()
      done()
    })

    it('should start worker server', function (done) {
      ponos.Server.returns({
        start: () => { return Promise.resolve() }
      })
      WorkerServer.listen().asCallback(function (err) {
        if (err) { return done(err) }
        sinon.assert.calledOnce(ponos.Server)
        sinon.assert.calledWith(ponos.Server, sinon.match({
          log: sinon.match.object,
          tasks: {
            'weave.health.check': sinon.match.any,
            'weave.kill': sinon.match.any,
            'weave.start': sinon.match.any,
            'weave.peer.forget': sinon.match.any,
            'weave.peer.remove': sinon.match.any
          },
          events: {
            'container.life-cycle.died': sinon.match.any,
            'container.life-cycle.started': sinon.match.any,
            'docker.events-stream.connected': sinon.match.any,
            'docker.events-stream.disconnected': sinon.match.any
          }
        }))
        done()
      })
    })

    it('should cb err if server failed', function (done) {
      ponos.Server.returns({
        start: sinon.stub().returns(Promise.reject(new Error('err')))
      })
      WorkerServer.listen().catch(function (err) {
        expect(err.message).to.equal('err')
        done()
      })
    })
  }) // end listen

  describe('stop', function () {
    beforeEach(function (done) {
      WorkerServer._server = {
        stop: sinon.stub()
      }
      done()
    })

    afterEach(function (done) {
      delete WorkerServer._server
      done()
    })

    it('should start worker server', function (done) {
      WorkerServer._server.stop.returns(Promise.resolve())

      WorkerServer.stop().asCallback(function (err) {
        if (err) { return done(err) }
        done()
      })
    })

    it('should cb err if server failed', function (done) {
      WorkerServer._server.stop.returns(Promise.reject(new Error('error')))

      WorkerServer.stop().catch(function (err) {
        expect(err.message).to.equal('error')
        done()
      })
    })
  }) // end stop
}) // end WorkerServer unit test
