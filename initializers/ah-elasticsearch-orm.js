var path = require('path')
var fs = require('fs')
var util = require('util')
var dateformat = require('dateformat')

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
}

module.exports = {
  loadPriority: 100,
  startPriority: 100,
  stopPriority: 999,

  initialize: function (api, next) {
    var Client = require(path.join(__dirname, '/../lib/client.js'))(api)

    var search = require(path.join(__dirname, '/../lib/aggregate/search.js'))(api)
    var mget = require(path.join(__dirname, '/../lib/aggregate/mget.js'))(api)
    var count = require(path.join(__dirname, '/../lib/aggregate/count.js'))(api)
    var scroll = require(path.join(__dirname, '/../lib/aggregate/scroll.js'))(api)
    var distinct = require(path.join(__dirname, '/../lib/aggregate/distinct.js'))(api)
    var aggregation = require(path.join(__dirname, '/../lib/aggregate/aggregation.js'))(api)

    var elasticsearchModel = require(path.join(__dirname, '/../lib/elasticsearchModel.js'))(api)

    // /////////////////////
    // api.elsasicsearch //
    // /////////////////////
    api.elasticsearch = {
      client: new Client(),
      indexes: [],
      pendingOperations: 0,

      // aggregate functions
      search: search,
      mget: mget,
      count: count,
      scroll: scroll,
      distinct: distinct,
      aggregation: aggregation,

      // instances
      elasticsearchModel: elasticsearchModel
    }

    // /////////////////////
    // INDEXES -> MODELS //
    // /////////////////////
    if (!api.models) { api.models = {} };

    var dir = path.normalize(api.config.elasticsearch.indexDefinitions)

    fs.readdirSync(dir).forEach(function (file) {
      var nameParts = file.split('/')
      var name = capitalize(nameParts[(nameParts.length - 1)].split('.')[0])
      var data = require(dir + '/' + file)
      api.elasticsearch.indexes[api.env + '-' + name.toLowerCase()] = data
      var modelName = capitalize(Object.keys(data.mappings)[0])
      var requiredFields = []

      var properties = {}
      if (data.mappings[modelName]) {
        properties = data.mappings[modelName].properties
      } else {
        properties = data.mappings[modelName.toLowerCase()].properties
      }

      var topLevelFields = Object.keys(properties)
      Object.keys(properties).forEach(function (field) {
        var props = properties[field]
        if (props.required === 'true' || props.required === true || props.required === null || props.required === undefined) {
          requiredFields.push(field)
        }
      })

      var thisInstance = function ElasticSearchModelInstance (guid, index, alias) {
        if (!index) { index = api.env + '-' + name.toLowerCase() + '-' + dateformat(new Date(), 'yyyy-mm') }
        if (!alias) { alias = api.env + '-' + name.toLowerCase() }
        api.elasticsearch.elasticsearchModel.call(this, modelName, guid, index, alias)
        this.requiredFields = requiredFields
        this.topLevelFields = topLevelFields
      }

      util.inherits(thisInstance, elasticsearchModel)

      api.models[modelName] = thisInstance
    })

    next()
  },

  start: function (api, next) {
    api.elasticsearch.client.ping({}, function (error) {
      if (error) {
        api.log('Cannot connect to ElasticSearch: ', 'crit')
        api.log(error, 'crit')
        next(error)
      } else {
        api.log('Connected to ElasticSearch')
        api.elasticsearch.client.info({}, function (error, info) {
          if (error) { return next(error) }
          var semverParts = info.version.number.split('.')
          if (semverParts[0] < 2) { return next(new Error('ElasticSearch version >= 2.0.0 required')) }
          api.elasticsearch.info = info
          next()
        })
      }
    })
  },

  stop: function (api, next) {
    if (api.elasticsearch.client) { api.elasticsearch.client.close() }
    next()
  }
}
