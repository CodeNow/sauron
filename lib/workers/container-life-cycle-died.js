/**
 * checks if the container that died is weave
 * if it is, create a start weave container job
 * @module lib/workers/container-life-cycle-died
 */
'use strict'
require('loadenv')()

const Promise = require('bluebird')
const RabbitMQ = require('../models/rabbitmq.js')

const schemas = require('../models/schemas')

exports.jobSchema = schemas.containerLifeCycleDied

exports.task = (job) => {
  return Promise.try(() => {
    if (!_isWeaveContainer(job)) { return }

    RabbitMQ.publishWeaveStart({
      dockerUri: job.host,
      orgId: job.org
    })
  })
}

/**
 * checks to see if this container is the weave container
 * image of weave container is weaveworks/weave:1.2.0
 * @param  {Object}  data event data
 * @return {Boolean} true if this weave container
 */
const _isWeaveContainer = exports._isWeaveContainer = function (data) {
  const image = data.from || ''
  return !!~image.indexOf(process.env.WEAVE_IMAGE_NAME)
}
