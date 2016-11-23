var path = require('path')
var fs = require('fs')
var async = require('async')
var dateformat = require('dateformat')
var request = require('request')
var prefix = process.env.PREFIX

var migrate = function (logger, callback) {
  var ActionHeroPrototype = require(process.cwd() + '/node_modules/actionhero/actionhero.js').actionheroPrototype
  var actionhero = new ActionHeroPrototype()
  var configChanges = {
    logger: { transports: null },
    general: { developmentMode: false }
  }

  actionhero.initialize({configChanges: configChanges}, function (error, api) {
    logger('Running migrations in env: ' + api.env)
    if (error) { return callback(error) }

    var dir = path.normalize(api.config.elasticsearch.indexDefinitions)
    var indexes = []

    fs.readdirSync(dir).forEach(function (file) {
      var nameParts = file.split('/')
      var name = nameParts[(nameParts.length - 1)].split('.')[0]
      var now = new Date()
      var thisMonth = dateformat(now, 'yyyy-mm')
      var nextMonth = dateformat(new Date(now.getTime() + (1000 * 60 * 60 * 24 * 31)), 'yyyy-mm')

      delete require.cache[require.resolve(dir + '/' + file)]
      var payload = require(dir + '/' + file)

      // strip out custom data we've added to the payload
      for (var t in payload.mappings) {
        for (var p in payload.mappings[t].properties) {
          var property = payload.mappings[t].properties[p]
          delete property.required
        }
      }

      for (var alias in payload.aliases) {
        if (prefix && prefix.length > 0) {
          payload.aliases[(prefix + '-' + api.env + '-' + alias)] = payload.aliases[alias]
        } else {
          payload.aliases[(api.env + '-' + alias)] = payload.aliases[alias]
        }
        delete payload.aliases[alias]
      }

      var indexNameBase = api.env + '-' + name
      if (prefix && prefix.length > 0) { indexNameBase = prefix + '-' + indexNameBase }

      indexes[indexNameBase + '-' + thisMonth] = payload
      indexes[indexNameBase + '-' + nextMonth] = payload
    })

    var migrationJobs = []
    api.elasticsearch.client.indices.get({index: '*'}, function (error, indices) {
      if (error) { return callback(error) }

      indices = Object.keys(indices)

      Object.keys(indexes).forEach(function (i) {
        if (indices.indexOf(i) < 0) {
          migrationJobs.push(function (next) {
            logger(' -> creating index: ' + i)
            var payload = indexes[i]
            // The ES client in v10.0.0 does not suppor much of the metatdata we need :(
            // payload.index = i;
            // api.elasticsearch.client.indices.create(payload, next);

            request.put(api.config.elasticsearch.urls[0] + '/' + i, {form: JSON.stringify(payload)}, function (error, data) {
              if (error) { return next(error) }
              var body = JSON.parse(data.body)
              if (body.error) { return next(body.error) }
              return next()
            })
          })
        } else {
          logger(' -> skipping index: ' + i + ', already exists')
        }
      })

      async.series(migrationJobs, callback)
    })
  })
}

module.exports = migrate
