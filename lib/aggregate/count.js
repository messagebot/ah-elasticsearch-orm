module.exports = function(api){
  var utils = require(__dirname + '/../utils.js')(api);

  var count = function(alias, searchKeys, searchValues, cacheTime, callback){
    if(typeof cacheTime === 'function'){ callback = cacheTime; cacheTime = null; }
    if(!cacheTime){ cacheTime = api.config.elasticsearch.cacheTime }

    var preparedQuery = {
      index: alias,
      body: {}
    };

    if(searchKeys && searchValues && searchKeys.length > 0 && searchValues.length > 0){
      var musts = utils.prepareQuery(searchKeys, searchValues);
      preparedQuery.body.query = {
        bool: { must: musts }
      };
    }

    var next = function(error, fromCache, data){
      if(error){ return callback(error); }
      callback(null, data.count, fromCache);
    };

    utils.runWithLimitAndCache(api.elasticsearch.client, 'count', [preparedQuery], cacheTime, next);
  };

  return count;
};
