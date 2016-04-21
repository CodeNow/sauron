'use strict'
require('loadenv')()

var Code = require('code')
var Lab = require('lab')
var nock = require('nock')
var pluck = require('101/pluck')
var sinon = require('sinon')

var Docker = require('../../../lib/models/docker.js')
var swarmInfo = require('../../fixtures/swarm-info-dynamic')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var afterEach = lab.afterEach
var beforeEach = lab.beforeEach
var expect = Code.expect

describe('docker integration test', function () {
  beforeEach(function (done) {
    try {
      Docker.loadCerts()
    } catch (e) {

    }
    done()
  })
  describe('info', function () {
    var dockerIp1 = '10.1.1.1'
    var dockerIp2 = '10.1.1.2'
    beforeEach(function (done) {
      nock('https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT, {"encodedQueryParams":true})
        .get('/info')
        .reply(200, swarmInfo([{
          ip: dockerIp1
        }, {
          ip: dockerIp2
        }]))
      done()
    })
    it('should get nodes', function (done) {
      Docker.info(function (err, infoData) {
        if (err) { return done(err) }
        var hosts = infoData.map(pluck('Host'))
        expect(hosts).to.include(dockerIp1 + ':4242')
        expect(hosts).to.include(dockerIp2 + ':4242')
        done()
      })
    })
  }) // end info

  describe('doesDockExist', function () {
    var dockerIp1 = '10.1.1.1'
    var dockerIp2 = '10.1.1.2'
    beforeEach(function (done) {
      nock('https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT, {"encodedQueryParams":true})
        .get('/info')
        .reply(200, swarmInfo([{
          ip: dockerIp1
        }, {
          ip: dockerIp2
        }]))
      done()
    })

    it('should return true', function (done) {
      Docker.doesDockExist(dockerIp1 + ':4242', function (err, exist) {
        if (err) { return done(err) }
        expect(exist).to.be.true()
        done()
      })
    })

    it('should return false', function (done) {
      Docker.doesDockExist( 'fake:4242', function (err, exist) {
        if (err) { return done(err) }
        expect(exist).to.be.false()
        done()
      })
    })
  }) // end doesDockExist
}) // end docker integration test
