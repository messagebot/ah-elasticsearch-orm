var path = require('path')

module.exports = function (api) {
  var utils = require(path.join(__dirname, '/../utils.js'))(api)

  var hydrate = function (callback) {
    var self = this

    if (!self.data.guid) { return callback(new Error('guid is required')) }
    if (!self.index) { return callback(new Error('index is required')) }

    // TODO: Can we use the GET api rather than a search?
    // You cannot GET over an alias...

    var query = {
      alias: self.alias,
      type: self.type,
      body: {
        query: { ids: { values: [self.data.guid] } }
      }
    }

    utils.runWithLimit(api.elasticsearch.client, 'search', [query], function (error, data) {
      if (error) { return callback(error) }
      if (data.hits.hits.length === 0) { return callback(new Error(self.type + ' (' + self.data.guid + ') not found')) }
      if (data.hits.hits.length > 1) { return callback(new Error(self.type + ' (' + self.data.guid + ') has more than one instace')) }

      self.data = data.hits.hits[0]._source

      inflateDates(self.data)

      self.data._index = data.hits.hits[0]._index
      callback(null, self.data)
    })
  }

  var inflateDates = function (hash) {
    var v
    for (var i in hash) {
      v = hash[i]
      if (v && isPlainObject(v)) { inflateDates(v) }

      if (v && typeof v === 'string') {
        if (v.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d*Z$/)) {
          hash[i] = new Date(hash[i])
        }
      }
    }
  }

  var isPlainObject = function (o) {
    var safeTypes = [Boolean, Number, String, Function, Array, Date, RegExp, Buffer]
    var safeInstances = ['boolean', 'number', 'string', 'function']
    var i

    if (!o) { return false }
    if ((o instanceof Object) === false) { return false }
    for (i in safeTypes) {
      if (o instanceof safeTypes[i]) { return false }
    }
    for (i in safeInstances) {
      if (typeof o === safeInstances[i]) { return false }
    }
    return (o.toString() === '[object Object]')
  }

  return hydrate
}
