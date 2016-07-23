var async = require('async');

module.exports = function(api){
  var utils = require(__dirname + '/../utils.js')(api);

  var del = function(callback){
    var self = this;
    var jobs = [];

    if(!self.data.guid){ return callback(new Error('guid is required')); }
    if(!self.index){     return callback(new Error('index is required')); }

    if(!self.data._index){
      jobs.push(function(done){
        self.hydrate(done);
      });
    }

    jobs.push(function(done){
      var query = {
        index: self.data._index,
        refresh: api.config.elasticsearch.refreshOnWrite,
        type: self.type,
        id: self.data.guid,
      };

      utils.runWithLimit(api.elasticsearch.client, 'delete', [query], done);
    });

    async.series(jobs, callback);
  };

  return del;
};
