var async = require('async')
var path = require('path')

module.exports = function (api) {
  var utils = require(path.join(__dirname, '/../utils.js'))(api)

  var mget = function (alias, ids, cacheTime, callback) {
    if (typeof cacheTime === 'function') { callback = cacheTime; cacheTime = null }
    if (!cacheTime) { cacheTime = api.config.elasticsearch.cacheTime }

    var indexes = [] // we meed to scan each index directly, not the alias
    var jobs = []
    var results = []
    var fromCache

    utils.runWithLimitAndCache(api.elasticsearch.client.cat, 'aliases', [{
      name: alias
    }], cacheTime, function (error, _fromCache, data) {
      if (error) { return callback(error) }

      data = data.split('\n')
      data.forEach(function (d) {
        var words = d.split(' ')
        if (words.length > 1) { indexes.push(words[1]) }
      })

      if (indexes.length === 0) { indexes = [alias] }

      indexes.forEach(function (index) {
        jobs.push(function (done) {
          var query = {
            index: index,
            body: {
              ids: ids
            }
          }

          var next = function (error, _fromCache, data) {
            if (error) { return done(error) }
            fromCache = _fromCache
            data.docs.forEach(function (doc) {
              if (doc.found === true) {
                results.push(doc._source)
              }
            })

            done()
          }

          utils.runWithLimitAndCache(api.elasticsearch.client, 'mget', [query], cacheTime, next)
        })
      })

      async.series(jobs, function (error) {
        return callback(error, results, fromCache)
      })
    })
  }

  return mget
}
