var utils = require(__dirname + '/../utils.js');

var distinct = function(api, alias, searchKeys, searchValues, start, end, dateField, field, callback){
  var aggs = {
    agg_results: {terms: {field: field}}
  };

  var musts = utils.prepareQuery(searchKeys, searchValues, start, end, dateField);

  var query = {
    size: 0,
    index: alias,
    body: {
      aggs: aggs,
      size: 0,
      query: {
        bool: {
          must: musts,
        }
      }
    }
  };

  var next = function(error, data){
    if(error){ return callback(error); }
    callback(null, data.aggregations.agg_results);
  };

  utils.runWithLimitAndCache(api, api.elasticsearch.client, 'search', [query], next);
};

module.exports = distinct;
