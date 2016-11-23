var path = require('path')

module.exports = function (api) {
  var utils = require(path.join(__dirname, '/../utils.js'))(api)

  var scroll = function (alias, query, fields, callback) {
    var scrollTime = '1m'
    var results = []

    var preparedQuery = {
      index: alias,
      scroll: scrollTime,
      _source: fields,
      size: 100,
      body: {
        query: query
      }
    }

    utils.runWithLimit(api.elasticsearch.client, 'search', [preparedQuery], function getMoreUntilDone (error, data) {
      if (error) { return callback(error) }
      if (data.hits.total === 0) { return callback(null, results, 0) }

      data.hits.hits.forEach(function (hit) {
        results.push(hit._source)
      })

      if (data.hits.total !== results.length && data.hits.hits.length > 0) {
        utils.runWithLimit(api.elasticsearch.client, 'scroll', [{
          scrollId: data._scroll_id,
          scroll: scrollTime
        }], getMoreUntilDone)
      } else {
        return callback(null, results, data.hits.total)
      }
    })
  }

  return scroll
}
