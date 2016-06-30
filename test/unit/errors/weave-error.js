'use strict'

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.describe
const it = lab.it
const Code = require('code')
const expect = Code.expect

const WeaveError = require('../../../lib/errors/weave-error.js')

describe('weave-error.js unit test', function () {
  describe('isIgnorable', function () {
    it('should return true', function (done) {
      [
        'container is not running.',
        'container had died',
        'Error: No such container 189237590128375'
      ].forEach(function (m) {
        var testErr = new WeaveError(new Error(m), '', '', '')
        expect(testErr.isIgnorable(testErr), m)
          .to.be.true()
      })
      done()
    })

    it('should return false', function (done) {
      [
        'is running.',
        'alive',
        'such container 189237590128375',
        'Error response from daemon: Untar error on re-exec cmd: fork/exec /proc/self/exe: cannot allocate memory'
      ].forEach(function (m) {
        var testErr = new WeaveError(new Error(m), '', '', '')
        expect(testErr.isIgnorable(testErr), m)
          .to.be.false()
      })
      done()
    })
  }) // end isIgnorable
})
