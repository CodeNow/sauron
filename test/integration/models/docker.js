'use strict'
require('loadenv')()

const Code = require('code')
const Lab = require('lab')
const nock = require('nock')
const pluck = require('101/pluck')

const Docker = require('../../../lib/models/docker.js')
const swarmInfo = require('../../fixtures/swarm-info-dynamic')

const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const beforeEach = lab.beforeEach
const expect = Code.expect

describe('docker integration test', function () {
  describe('info', function () {
    const dockerIp1 = '10.1.1.1'
    const dockerIp2 = '10.1.1.2'
    beforeEach(function (done) {
      nock('https://' + process.env.SWARM_HOSTNAME + ':' + process.env.SWARM_PORT,
      { 'encodedQueryParams': true })
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
        const hosts = infoData.map(pluck('Host'))
        expect(hosts).to.include(dockerIp1 + ':4242')
        expect(hosts).to.include(dockerIp2 + ':4242')
        done()
      })
    })
  }) // end info
}) // end docker integration test
