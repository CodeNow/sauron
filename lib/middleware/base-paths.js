'use strict';
require('loadenv')();

module.exports = BasePaths;

/**
 * handles basics paths
 */
function BasePaths () { }

/**
 * responds info of service
 * @param  {Object} req express req object
 * @param  {Object} res express res object
 */
BasePaths.root = function (req, res) {
  res
    .status(200)
    .json({
      message: process.env.npm_package_description,
      git: process.env.npm_package_gitHead,
      config: process.env
    });
};

/**
 * responds 404 for all routes
 * @param  {Object}   req  express req object
 * @param  {Object}   res  express res object
 * @param  {Function} next express req object
 */
BasePaths.all = function (req, res) {
  res
    .status(404)
    .json({
      message: 'route not implemented'
    });
};
