var utils = require(__dirname + '/../utils.js');

var del = function(callback){
  var self = this;

  if(!self.data.guid){ return callback(new Error('guid is required')); }
  if(!self.index){     return callback(new Error('index is required')); }

  var query = {
    index: self.data._index,
    refresh: self.api.config.elasticsearch.refreshOnWrite,
    type: self.type,
    id: self.data.guid,
  };

  utils.runWithLimit(self.api, self.api.elasticsearch.client, 'delete', [query], callback);
};

module.exports = del;
