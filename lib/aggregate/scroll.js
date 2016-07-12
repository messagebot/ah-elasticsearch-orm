var utils = require(__dirname + '/../utils.js');

var scroll = function(api, alias, query, fields, callback){
  var scroll = '1m';
  var results = [];

  var query = {
    index: alias,
    scroll: scroll,
    fields: fields,
    size: 100,
    body: {
      query: query
    }
  };

  utils.runWithLimitAndCache(api, api.elasticsearch.client, 'search', [query], function getMoreUntilDone(error, data){
    if(error){ return callback(error); }
    if(data.hits.total === 0){ return callback(); }

    data.hits.hits.forEach(function(hit){
      results.push(hit.fields);
    });

    if(data.hits.total !== results.length && data.hits.hits.length > 0){
      utils.runWithLimitAndCache(api, api.elasticsearch.client, 'scroll', [{
        scrollId: data._scroll_id,
        scroll: scroll
      }], getMoreUntilDone);
    }else{
      return callback(null, results, data.hits.total);
    }
  });
};

module.exports = scroll;
