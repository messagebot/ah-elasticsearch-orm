module.exports = function(api){
  var utils = require(__dirname + '/../utils.js')(api);

  var search = function(alias, searchKeys, searchValues, from, size, sort, cacheTime, callback){
    if(typeof cacheTime === 'function'){ callback = cacheTime; cacheTime = null; }
    if(!cacheTime){ cacheTime = api.config.elasticsearch.cacheTime }

    var results = [];

    if(!sort){
      sort = [
        { "createdAt" : "desc"}
      ];
    }

    var query = {
      index: alias,
      from: from,
      size: size,
      body: {
        sort: sort,
        query: {
          bool: {
            must: utils.prepareQuery(searchKeys, searchValues)
          }
        }
      }
    }

    // sort looks like `[{ "createdAt" : "desc"}]`
    if(sort){ query.body.sort = sort; }

    var next = function(error, fromCache, data){
      if(error){ return callback(error); }
      data.hits.hits.forEach(function(hit){
        results.push(hit._source);
      });
      callback(null, results, data.hits.total, fromCache);
    };

    utils.runWithLimitAndCache(api.elasticsearch.client, 'search', [query], cacheTime, next);
  };

  return search;
};
