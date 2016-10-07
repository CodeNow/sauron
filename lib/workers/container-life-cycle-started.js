/**
 * attach network to container
 * @module lib/workers/container-life-cycle-started
 */
'use strict'
require('loadenv')()

const Events = require('../models/events.js')
const keypather = require('keypather')()
const schemas = require('../models/schemas')

exports.maxNumRetries = 4

exports.jobSchema = schemas.containerLifeCycleStarted

exports.task = (job) => {
  const type = keypather.get(job, 'inspectData.Config.Labels.type')
  // if type is there ignore `layerCopy` -> those containers don't need network
  if (type === 'layerCopy') {
    return Promise.resolve()
  }
  return Events.handleStartedAsync(job)
}
