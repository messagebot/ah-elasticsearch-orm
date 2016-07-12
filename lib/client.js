var elasticsearch = require('elasticsearch');

module.exports = function(api){
  return new elasticsearch.Client({
    hosts: api.config.elasticsearch.urls,
    log: api.config.elasticsearch.log,
  });
}
