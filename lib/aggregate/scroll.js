var utils = require(__dirname + '/../utils.js');

var scroll = function(api, alias, query, fields, callback){
  var scroll = '1m';
  var results = [];

  var query = {
    index: alias,
    scroll: scroll,
    fields: fields,
    body: {
      query: query
    }
  };

  utils.runWithLimitAndCache(api, api.elasticsearch.client, 'search', [query], function getMoreUntilDone(error, data){
    if(error){ return callback(error); }

    data.hits.hits.forEach(function(hit){
      if(hit.fields.personGuid){
        results = results.concat(hit.fields.personGuid);
      }else if(hit.fields.guid){
        results = results.concat(hit.fields.guid);
      }
    });

    if(data.hits.total !== results.length && data.hits.hits.length > 0){
      utils.runWithLimitAndCache(api, api.elasticsearch.client, 'scroll', [{
        scrollId: data._scroll_id,
        scroll: scroll
      }], getMoreUntilDone);
    }else{
      callback(null, results, data.hits.total);
    }
  });
};

module.exports = scroll;
