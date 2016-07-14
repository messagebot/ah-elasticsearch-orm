var utils = require(__dirname + '/../utils.js');

var aggregation = function(api, alias, searchKeys, searchValues, start, end, dateField, agg, aggField, interval, cacheTime, callback){
  if(typeof cacheTime === 'function'){ callback = cacheTime; cacheTime = null; }
  if(!cacheTime){ cacheTime = api.config.elasticsearch.cacheTime }

  var aggs = {agg_results: {}};
  if(interval){
    var format = 'yyyy-MM-dd';
    if(interval === 'year'){        format = 'yyyy';                }
    else if(interval === 'month'){  format = 'yyyy-MM';             }
    else if(interval === 'week'){   format = 'yyyy-MM-dd';          }
    else if(interval === 'day'){    format = 'yyyy-MM-dd';          }
    else if(interval === 'hour'){   format = 'yyyy-MM-dd HH:00';    }
    else if(interval === 'minute'){ format = 'yyyy-MM-dd HH:mm';    }
    else if(interval === 'second'){ format = 'yyyy-MM-dd HH:mm:ss'; }

    aggs.agg_results[agg] = {
      field: aggField,
      interval: interval,
      format: format,
    };
  }else{
    aggs.agg_results[agg] = { field: aggField };
  }

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

  var next = function(error, fromCache, data){
    if(error){ return callback(error); }
    callback(null, data.aggregations.agg_results, fromCache);
  }

  utils.runWithLimitAndCache(api, api.elasticsearch.client, 'search', [query], cacheTime, next);
};

module.exports = aggregation;
