var crypto = require('crypto')

module.exports = function (api) {
  var utils = {}

  utils.cleanGuid = function (guid) {
    // elasticsearch hates '-' so we remove them
    if (!guid) { return null }

    guid = guid.replace(/-/g, '')
    guid = guid.replace(/\s/g, '')
    return guid
  }

  utils.prepareQuery = function (searchKeys, searchValues, start, end, dateField) {
    var musts = []
    var q, key, val

    for (var i in searchKeys) {
      q = {}
      key = searchKeys[i]
      val = searchValues[i]

      if (typeof (val) === 'string') {
        val = val.toLowerCase()
      }

      if (val === '_exists') {
        q['field'] = key
        musts.push({ exists: q })
      } else if (val === '_missing') {
        q['field'] = key
        musts.push({ missing: q })
      } else if (typeof val === 'string' && val.indexOf('*') >= 0) {
        q[key] = val
        musts.push({ wildcard: q })
      } else {
        q[key] = val
        musts.push({ term: q })
      }
    }

    if (start && end && dateField) {
      var range = {}
      range[dateField] = {gte: start.getTime(), lte: end.getTime()}
      musts.push({range: range})
    }

    return musts
  }

  utils.runWithLimit = function (client, method, args, callback) {
    var combinedArgs = args.concat([function () {
      api.elasticsearch.pendingOperations--
      return callback.apply(this, arguments)
    }])

    if (api.elasticsearch.pendingOperations < api.config.elasticsearch.maxPendingOperations) {
      api.elasticsearch.pendingOperations++
      client[method].apply(client, combinedArgs)
    } else if (api.config.elasticsearch.maxPendingOperationsBehavior === 'fail') {
      return callback(new Error('Too many pending ElasticSearch operations'))
    } else {
      setTimeout(function () {
        utils.runWithLimit(client, method, args, callback)
      }, api.config.elasticsearch.maxPendingOperationsSleep)
    }
  }

  utils.runWithLimitAndCache = function (client, method, args, cacheTime, callback) {
    if (!cacheTime || cacheTime === 0) {
      return utils.runWithLimit(client, method, args, callback)
    }

    var key = [method, JSON.stringify(args)].join(':')
    key = crypto.createHash('md5').update(key).digest('hex')

    api.cache.load(key, function (error, result) {
      if (error) {
        // note: if there is a cache error, defer to ES
        var e = error.toString().toLowerCase()
        if (!e.match(/object not found/) && !e.match(/object expired/)) {
          return callback(error)
        }
      }

      if (result) { return callback.apply(this, ([null, true]).concat(result)) }

      utils.runWithLimit(client, method, args, function (error) {
        if (error) { return callback(error) }

        var savedArgs = []
        for (var i = 1; i < arguments.length; i++) {
          savedArgs.push(arguments[i])
        }

        api.cache.save(key, savedArgs, cacheTime, function (error) {
          if (error) { return callback(error) }
          return callback.apply(this, ([null, false]).concat(savedArgs))
        })
      })
    })
  }

  return utils
}
