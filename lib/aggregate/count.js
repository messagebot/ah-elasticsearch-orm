var utils = require(__dirname + '/../utils.js');

var count = function(api, alias, searchKeys, searchValues, cacheTime, callback){
  if(typeof cacheTime === 'function'){ callback = cacheTime; cacheTime = null; }
  if(!cacheTime){ cacheTime = api.config.elasticsearch.cacheTime }

  var query = {
    index: alias,
    body: {}
  };

  if(searchKeys && searchValues && searchKeys.length > 0 && searchValues.length > 0){
    var musts = utils.prepareQuery(searchKeys, searchValues);
    query.body.query = {
      bool: { must: musts }
    };
  }

  var next = function(error, fromCache, data){
    if(error){ return callback(error); }
    callback(null, data.count, fromCache);
  };

  utils.runWithLimitAndCache(api, api.elasticsearch.client, 'count', [query], cacheTime, next);
};

module.exports = count;