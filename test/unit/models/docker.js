
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
const Swarm = require('@runnable/loki').Swarm
const sinon = require('sinon')
const Promise = require('bluebird')
require('sinon-as-promised')(Promise)

const Docker = require('../../../lib/models/docker')
const swarmInfo = require('../../fixtures/swarm-info-dynamic')

describe('lib/models/docker unit test', function () {
  describe('doesDockExist', function () {
    beforeEach(function (done) {
      sinon.stub(Swarm.prototype, 'swarmHostExistsAsync')
      done()
    })

    afterEach(function (done) {
      Swarm.prototype.swarmHostExistsAsync.restore()
      done()
    })

    it('should cb swarm error', function (done) {
      var testError = new Error('bee')
      Swarm.prototype.swarmHostExistsAsync.rejects(testError)

      Docker.doesDockExist('8.8.8.8:4242').asCallback(function (err) {
        expect(err).to.equal(testError)
        sinon.assert.calledOnce(Swarm.prototype.swarmHostExistsAsync)
        sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, '8.8.8.8:4242')
        done()
      })
    })

    it('should cb true if dock in list', function (done) {
      Swarm.prototype.swarmHostExistsAsync.resolves(true)

      Docker.doesDockExist('10.0.0.1:4242').asCallback(function (err, exists) {
        expect(err).to.not.exist()
        expect(exists).to.be.true()
        sinon.assert.calledOnce(Swarm.prototype.swarmHostExistsAsync)
        sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, '10.0.0.1:4242')
        done()
      })
    })

    it('should cb with null if dock not in list', function (done) {
      Swarm.prototype.swarmHostExistsAsync.resolves(false)

      Docker.doesDockExist('10.0.0.2:4242').asCallback(function (err, exists) {
        if (err) { return done(err) }
        expect(exists).to.be.false()
        sinon.assert.calledOnce(Swarm.prototype.swarmHostExistsAsync)
        sinon.assert.calledWith(Swarm.prototype.swarmHostExistsAsync, '10.0.0.2:4242')
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
      var orgDocks = Docker._findDocksByOrgId(nodes, '4643352')
      expect(orgDocks.length).to.equal(3)
      done()
    })
    it('should return [] if no docks were found', function (done) {
      var orgDocks = Docker._findDocksByOrgId(nodes, '1111111')
      expect(orgDocks.length).to.equal(0)
      done()
    })
    it('should return [] if no doc has no labels', function (done) {
      nodes.map(function (node) {
        delete node.Labels
      })
      var orgDocks = Docker._findDocksByOrgId(nodes, '445457')
      expect(orgDocks.length).to.equal(0)
      done()
    })
  })

  describe('findDocksByOrgId', function () {
    beforeEach(function (done) {
      sinon.stub(Docker, 'info')
      sinon.stub(Docker, '_findDocksByOrgId')
      done()
    })

    afterEach(function (done) {
      Docker.info.restore()
      Docker._findDocksByOrgId.restore()
      done()
    })

    it('should cb swarm error', function (done) {
      var testError = new Error('bee')
      Docker.info.rejects(testError)

      Docker.findDocksByOrgId('4643352', function (err) {
        expect(err).to.equal(testError)
        sinon.assert.calledOnce(Docker.info)
        sinon.assert.calledWith(Docker.info)
        done()
      })
    })

    it('should cb with nodes', function (done) {
      var testDocks = [1, 2]
      var testInfo = ['a', 'b']
      var testOrgId = '4643352'

      Docker.info.resolves(testInfo)
      Docker._findDocksByOrgId.returns(testDocks)

      Docker.findDocksByOrgId(testOrgId, function (err, docks) {
        if (err) { return done(err) }

        expect(docks).to.equal(testDocks)

        sinon.assert.calledOnce(Docker.info)
        sinon.assert.calledWith(Docker.info)

        sinon.assert.calledOnce(Docker._findDocksByOrgId)
        sinon.assert.calledWith(Docker._findDocksByOrgId, testInfo, testOrgId)
        done()
      })
    })
  })

  describe('findLightestOrgDock', function () {
    beforeEach(function (done) {
      sinon.stub(Docker, 'findDocksByOrgId')
      done()
    })

    afterEach(function (done) {
      Docker.findDocksByOrgId.restore()
      done()
    })

    it('should cb swarm error', function (done) {
      var testError = new Error('bee')
      var testOrgId = '4643352'

      Docker.findDocksByOrgId.yieldsAsync(testError)

      Docker.findLightestOrgDock(testOrgId, function (err) {
        expect(err).to.equal(testError)
        sinon.assert.calledOnce(Docker.findDocksByOrgId)
        sinon.assert.calledWith(Docker.findDocksByOrgId, testOrgId, sinon.match.func)
        done()
      })
    })

    it('should with the lightest node', function (done) {
      var testOrgId = '4643352'

      Docker.findDocksByOrgId.yieldsAsync(null, [{
        Containers: 5
      }, {
        Containers: 10
      }])

      Docker.findLightestOrgDock(testOrgId, function (err, dock) {
        if (err) { return done(err) }
        expect(dock.Containers).to.equal(5)
        sinon.assert.calledOnce(Docker.findDocksByOrgId)
        sinon.assert.calledWith(Docker.findDocksByOrgId, testOrgId, sinon.match.func)
        done()
      })
    })

    it('should cb with null if no nodes found for an org', function (done) {
      var testOrgId = '111111'

      Docker.findDocksByOrgId.yieldsAsync(null, [])

      Docker.findLightestOrgDock(testOrgId, function (err, dock) {
        if (err) { return done(err) }
        expect(dock).to.not.exist()
        sinon.assert.calledOnce(Docker.findDocksByOrgId)
        sinon.assert.calledWith(Docker.findDocksByOrgId, testOrgId, sinon.match.func)
        done()
      })
    })
  })

  describe('info', function () {
    beforeEach(function (done) {
      sinon.stub(Swarm.prototype, 'swarmInfoAsync')
      done()
    })

    afterEach(function (done) {
      Swarm.prototype.swarmInfoAsync.restore()
      done()
    })

    it('should cb swarm error', function (done) {
      var testError = new Error('bee')
      Swarm.prototype.swarmInfoAsync.rejects(testError)

      Docker.info()
      .tap(() => {
        done(new Error('Should never happen'))
      })
      .catch((err) => {
        expect(err).to.equal(testError)
        sinon.assert.calledOnce(Swarm.prototype.swarmInfoAsync)
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
      Swarm.prototype.swarmInfoAsync.resolves(swarmInfoData)

      Docker.info()
      .then((docks) => {
        expect(docks.length).to.equal(3)
        sinon.assert.calledOnce(Swarm.prototype.swarmInfoAsync)
        done()
      })
      .catch(done)
    })
  })
})
