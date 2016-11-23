var path = require('path')

module.exports = function (api) {
  var utils = require(path.join(__dirname, '/../utils.js'))(api)

  var distinct = function (alias, searchKeys, searchValues, start, end, dateField, field, cacheTime, callback) {
    if (typeof cacheTime === 'function') { callback = cacheTime; cacheTime = null }
    if (!cacheTime) { cacheTime = api.config.elasticsearch.cacheTime }

    var aggs = {
      agg_results: {terms: {field: field}}
    }

    var musts = utils.prepareQuery(searchKeys, searchValues, start, end, dateField)

    var preparedQuery = {
      size: 0,
      index: alias,
      body: {
        aggs: aggs,
        size: 0,
        query: {
          bool: {
            must: musts
          }
        }
      }
    }

    var next = function (error, fromCache, data) {
      if (error) { return callback(error) }
      callback(null, data.aggregations.agg_results, fromCache)
    }

    utils.runWithLimitAndCache(api.elasticsearch.client, 'search', [preparedQuery], cacheTime, next)
  }

  return distinct
}
