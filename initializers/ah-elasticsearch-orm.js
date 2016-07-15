var path       = require('path');
var fs         = require('fs');
var util       = require('util');
var dateformat = require('dateformat');

var client = require(__dirname + '/../lib/client.js');

var search      = require(__dirname + '/../lib/aggregate/search.js');
var mget        = require(__dirname + '/../lib/aggregate/mget.js');
var scroll      = require(__dirname + '/../lib/aggregate/scroll.js');
var distinct    = require(__dirname + '/../lib/aggregate/distinct.js');
var aggregation = require(__dirname + '/../lib/aggregate/aggregation.js');

var elasticsearchModel = require(__dirname + '/../lib/elasticsearchModel.js');

module.exports = {
  loadPriority:  100,
  startPriority: 100,
  stopPriority:  999,

  initialize: function(api, next){

    ///////////////////////
    // api.elsasicsearch //
    ///////////////////////
    api.elasticsearch = {
      client: new client(api),
      indexes: [],
      pendingOperations: 0,

      // aggregate functions
      search:      search,
      mget:        mget,
      scroll:      scroll,
      distinct:    distinct,
      aggregation: aggregation,

      // instances
      elasticsearchModel: elasticsearchModel,
    };

    ///////////////////////
    // INDEXES -> MODELS //
    ///////////////////////
    if(!api.models){ api.models = {} };

    var dir = path.normalize(api.config.elasticsearch.indexDefinitions);

    fs.readdirSync(dir).forEach(function(file){
      var nameParts = file.split("/");
      var name = nameParts[(nameParts.length - 1)].split(".")[0];
      var data = require(dir + '/' + file);
      api.elasticsearch.indexes[api.env + '-' + name] = data;
      var modelName = Object.keys(data.mappings)[0];
      var requiredFields = Object.keys(data.mappings[modelName].properties);

      var thisInstance = function ElasticSearchModelInstance(guid, index, alias){
        if(!index){ index = api.env + '-' + name + '-' + dateformat(new Date(), 'yyyy-mm'); }
        if(!alias){ alias = api.env + '-' + name; }
        api.elasticsearch.elasticsearchModel.call(this, api, modelName, guid, index, alias);
        this.requiredFields = requiredFields;
      };

      util.inherits(thisInstance, elasticsearchModel);

      api.models[modelName] = thisInstance;
    });

    next();
  },

  start: function(api, next){
    api.elasticsearch.client.ping({}, function(error){
      if(error){
        api.log('Cannot connect to ElasticSearch: ', 'crit');
        api.log(error, 'crit');
        next(error);
      }else{
        api.log('Connected to ElasticSearch');
        api.elasticsearch.client.info({}, function(error, info){
          var semverParts = info.version.number.split('.');
          if(semverParts[0] < 5){ return next(new Error('ElasticSearch version >= 2.0.0 required')) }
          api.elasticsearch.info = info;
          next();
        });
      }
    });
  },

  stop: function(api, next){
    if(api.elasticsearch.client){ api.elasticsearch.client.close(); }
    next();
  }
};
