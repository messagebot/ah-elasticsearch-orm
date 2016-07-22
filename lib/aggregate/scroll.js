module.exports = function(api){
  var utils = require(__dirname + '/../utils.js')(api);

  var scroll = function(alias, query, fields, callback){
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

    utils.runWithLimit(api.elasticsearch.client, 'search', [query], function getMoreUntilDone(error, data){
      if(error){ return callback(error); }
      if(data.hits.total === 0){ return callback(null, results, 0); }

      data.hits.hits.forEach(function(hit){
        var hash = {};
        Object.keys(hit.fields).forEach(function(key){
          if(hit.fields[key].length === 1){
            hash[key] = hit.fields[key][0];
          }else{
            hash[key] = hit.fields[key];
          }
        });
        results.push(hash);
      });

      if(data.hits.total !== results.length && data.hits.hits.length > 0){
        utils.runWithLimit(api.elasticsearch.client, 'scroll', [{
          scrollId: data._scroll_id,
          scroll: scroll
        }], getMoreUntilDone);
      }else{
        return callback(null, results, data.hits.total);
      }
    });
  };

  return scroll;
};
