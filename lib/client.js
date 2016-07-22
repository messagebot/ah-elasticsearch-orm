var elasticsearch = require('elasticsearch');

module.exports = function(api){
  return function(){
    return new elasticsearch.Client({
      hosts: api.config.elasticsearch.urls,
      log: api.config.elasticsearch.log,
    });
  }
}
