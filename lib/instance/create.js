var async = require('async');

module.exports = function(api){
  var utils = require(__dirname + '/../utils.js')(api);

  var create = function(callback){
    var self = this;
    var jobs = [];

    self.ensureGuid();
    if(!self.index){ return callback(new Error('index is required')); }

    var payload;
    try{
      payload = self.prepareData();
    }catch(e){ return callback(e); }

    if(self.data.createdAt){
      payload.createdAt = self.data.createdAt;
    }

    var jobBuilder = function(k,v){
      jobs.push(function(done){
        api.elasticsearch.search(self.alias, [k], [v], 0, 1, null, 1, function(error, results){
          if(error){ return done(error); }
          if(results.length === 0){ return done(); }
          return done( new Error('uniqueFields:' + k + ' uniqueness violated via #' + results[0].guid) );
        });
      });
    }

    // We need to ensure that none of the params this new instance has match an existing instance.
    api.config.elasticsearch.uniqueFields[self.type].forEach(function(k){
      if(payload[k]){ jobBuilder(k, payload[k]); }
      if(payload.data[k]){ jobBuilder(('data.' + k), payload.data[k]); }
    });


    jobs.push(function(done){
      var query = {
        index: self.index,
        refresh: api.config.elasticsearch.refreshOnWrite,
        type: self.type,
        id: self.data.guid,
        body: payload
      };

      utils.runWithLimit(api.elasticsearch.client, 'create', [query], done);
    });

    jobs.push(function(done){
      if(!self.data._index){ self.data._index = self.index; }
      done();
    });

    async.series(jobs, callback);
  };

  return create;
};
