
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

const Swarmerode = require('swarmerode')._Swarmerode
const SwarmClient = require('@runnable/loki').SwarmClient
const sinon = require('sinon')
const Promise = require('bluebird')
require('sinon-as-promised')(Promise)

const Swarm = require('../../../lib/models/swarm')
const swarmInfo = require('../../fixtures/swarm-info-dynamic')

describe('lib/models/swarm unit test', function () {
  describe('doesDockExist', function () {
    beforeEach(function (done) {
      sinon.stub(SwarmClient.prototype, 'swarmHostExistsAsync')
      done()
    })

    afterEach(function (done) {
      SwarmClient.prototype.swarmHostExistsAsync.restore()
      done()
    })

    it('should cb swarm error', function (done) {
      var testError = new Error('bee')
      SwarmClient.prototype.swarmHostExistsAsync.rejects(testError)

      Swarm.doesDockExist('8.8.8.8:4242').asCallback(function (err) {
        expect(err).to.equal(testError)
        sinon.assert.calledOnce(SwarmClient.prototype.swarmHostExistsAsync)
        sinon.assert.calledWith(SwarmClient.prototype.swarmHostExistsAsync, '8.8.8.8:4242')
        done()
      })
    })

    it('should cb true if dock in list', function (done) {
      SwarmClient.prototype.swarmHostExistsAsync.resolves(true)

      Swarm.doesDockExist('10.0.0.1:4242').asCallback(function (err, exists) {
        expect(err).to.not.exist()
        expect(exists).to.be.true()
        sinon.assert.calledOnce(SwarmClient.prototype.swarmHostExistsAsync)
        sinon.assert.calledWith(SwarmClient.prototype.swarmHostExistsAsync, '10.0.0.1:4242')
        done()
      })
    })

    it('should cb with null if dock not in list', function (done) {
      SwarmClient.prototype.swarmHostExistsAsync.resolves(false)

      Swarm.doesDockExist('10.0.0.2:4242').asCallback(function (err, exists) {
        if (err) { return done(err) }
        expect(exists).to.be.false()
        sinon.assert.calledOnce(SwarmClient.prototype.swarmHostExistsAsync)
        sinon.assert.calledWith(SwarmClient.prototype.swarmHostExistsAsync, '10.0.0.2:4242')
        done()
      })
    })
  }) // end doesDockExist

  describe('_findDocksByOrgId', function () {
    var nodes
    beforeEach(function (done) {
      nodes = [
        {
          Labels: {
            org: '4643352'
          }
        },
        {
          Labels: {
            org: '4643352'
          }
        },
        {
          Labels: {
            org: '4643352'
          }
        },
        {
          Labels: {
            org: '2222222'
          }
        },
        {
          Labels: {
            org: '2222222'
          }
        },
        {
          Labels: {
            org: '2222222'
          }
        }
      ]
      done()
    })
    it('should find 3 docks for an org', function (done) {
      var orgDocks = Swarm._findDocksByOrgId(nodes, '4643352')
      expect(orgDocks.length).to.equal(3)
      done()
    })
    it('should return [] if no docks were found', function (done) {
      var orgDocks = Swarm._findDocksByOrgId(nodes, '1111111')
      expect(orgDocks.length).to.equal(0)
      done()
    })
    it('should return [] if no doc has no labels', function (done) {
      nodes.map(function (node) {
        delete node.Labels
      })
      var orgDocks = Swarm._findDocksByOrgId(nodes, '445457')
      expect(orgDocks.length).to.equal(0)
      done()
    })
  })

  describe('findDocksByOrgId', function () {
    beforeEach(function (done) {
      sinon.stub(Swarm, 'info')
      sinon.stub(Swarm, '_findDocksByOrgId')
      done()
    })

    afterEach(function (done) {
      Swarm.info.restore()
      Swarm._findDocksByOrgId.restore()
      done()
    })

    it('should cb swarm error', function (done) {
      var testError = new Error('bee')
      Swarm.info.rejects(testError)

      Swarm.findDocksByOrgId('4643352', function (err) {
        expect(err).to.equal(testError)
        sinon.assert.calledOnce(Swarm.info)
        sinon.assert.calledWith(Swarm.info)
        done()
      })
    })

    it('should cb with nodes', function (done) {
      var testDocks = [1, 2]
      var testInfo = ['a', 'b']
      var testOrgId = '4643352'

      Swarm.info.resolves(testInfo)
      Swarm._findDocksByOrgId.returns(testDocks)

      Swarm.findDocksByOrgId(testOrgId, function (err, docks) {
        if (err) { return done(err) }

        expect(docks).to.equal(testDocks)

        sinon.assert.calledOnce(Swarm.info)
        sinon.assert.calledWith(Swarm.info)

        sinon.assert.calledOnce(Swarm._findDocksByOrgId)
        sinon.assert.calledWith(Swarm._findDocksByOrgId, testInfo, testOrgId)
        done()
      })
    })
  })

  describe('findLightestOrgDock', function () {
    beforeEach(function (done) {
      sinon.stub(Swarm, 'findDocksByOrgId')
      done()
    })

    afterEach(function (done) {
      Swarm.findDocksByOrgId.restore()
      done()
    })

    it('should cb swarm error', function (done) {
      var testError = new Error('bee')
      var testOrgId = '4643352'

      Swarm.findDocksByOrgId.yieldsAsync(testError)

      Swarm.findLightestOrgDock(testOrgId, function (err) {
        expect(err).to.equal(testError)
        sinon.assert.calledOnce(Swarm.findDocksByOrgId)
        sinon.assert.calledWith(Swarm.findDocksByOrgId, testOrgId, sinon.match.func)
        done()
      })
    })

    it('should with the lightest node', function (done) {
      var testOrgId = '4643352'

      Swarm.findDocksByOrgId.yieldsAsync(null, [{
        Containers: 5
      }, {
        Containers: 10
      }])

      Swarm.findLightestOrgDock(testOrgId, function (err, dock) {
        if (err) { return done(err) }
        expect(dock.Containers).to.equal(5)
        sinon.assert.calledOnce(Swarm.findDocksByOrgId)
        sinon.assert.calledWith(Swarm.findDocksByOrgId, testOrgId, sinon.match.func)
        done()
      })
    })

    it('should cb with null if no nodes found for an org', function (done) {
      var testOrgId = '111111'

      Swarm.findDocksByOrgId.yieldsAsync(null, [])

      Swarm.findLightestOrgDock(testOrgId, function (err, dock) {
        if (err) { return done(err) }
        expect(dock).to.not.exist()
        sinon.assert.calledOnce(Swarm.findDocksByOrgId)
        sinon.assert.calledWith(Swarm.findDocksByOrgId, testOrgId, sinon.match.func)
        done()
      })
    })
  })

  describe('info', function () {
    beforeEach(function (done) {
      sinon.stub(SwarmClient.prototype, 'swarmInfoAsync')
      done()
    })

    afterEach(function (done) {
      SwarmClient.prototype.swarmInfoAsync.restore()
      done()
    })

    it('should cb swarm error', function (done) {
      var testError = new Error('bee')
      SwarmClient.prototype.swarmInfoAsync.rejects(testError)

      Swarm.info()
      .tap(() => {
        done(new Error('Should never happen'))
      })
      .catch((err) => {
        expect(err).to.equal(testError)
        sinon.assert.calledOnce(SwarmClient.prototype.swarmInfoAsync)
        done()
      })
    })

    it('should cb with the list of all docks', function (done) {
      const swarmInfoData = swarmInfo([{
        ip: '10.0.0.1',
        org: '12345125'
      }, {
        ip: '10.0.0.2',
        org: '12345125'
      }, {
        ip: '10.0.0.3',
        org: 'fake'
      }])
      swarmInfoData.parsedSystemStatus = Swarmerode._parseSwarmSystemStatus(swarmInfoData.SystemStatus)
      SwarmClient.prototype.swarmInfoAsync.resolves(swarmInfoData)

      Swarm.info()
      .then((docks) => {
        expect(docks.length).to.equal(3)
        sinon.assert.calledOnce(SwarmClient.prototype.swarmInfoAsync)
        done()
      })
      .catch(done)
    })
  })
})
