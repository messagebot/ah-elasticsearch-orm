var async = require('async');

module.exports = function(api){
  var utils = require(__dirname + '/../utils.js')(api);

  var edit = function(callback){
    var self = this;
    var jobs = [];
    var checkJobs = [];
    var payload;

    if(!self.data.guid){ return callback(new Error('guid is required')); }

    jobs.push(function(done){
      try{
        payload = self.prepareData(true);
      }catch(e){ return done(e); }
      done();
    });

    jobs.push(function(done){
      self.hydrate(done);
    });

    jobs.push(function(done){
      Object.keys(payload).forEach(function(k){
        if(self.topLevelFields.indexOf(k) >= 0 && k !== 'data'){
          self.data[k] = payload[k];
        }
      });

      Object.keys(payload.data).forEach(function(k){
        if(payload.data[k] !== '_delete'){
          self.data.data[k] = payload.data[k];
        }else{
          delete self.data.data[k];
        }
      });

      done();
    });

    jobs.push(function(done){
      try{
        payload = self.prepareData();
      }catch(e){ return done(e); }
      done();
    });

    jobs.push(function(done){
      // We need to ensure that none of the params this new instance has match an existing instance.

      var jobBuilder = function(k,v){
        checkJobs.push(function(checkDone){
          api.elasticsearch.search(self.alias, [k], [v], 0, 2, null, 1, function(error, results){
            if(error){ return checkDone(error); }
            if(results.length === 0){ return checkDone(); }
            if(results.length === 1 && results[0].guid === self.data.guid){ return checkDone(); }
            return checkDone( new Error('uniqueFields:' + k + ' uniqueness violated via #' + results[0].guid) );
          });
        });
      }

      api.config.elasticsearch.uniqueFields[self.type].forEach(function(k){
        if(payload[k]){ jobBuilder(k, payload[k]); }
        if(payload.data[k]){ jobBuilder(('data.' + k), payload.data[k]); }
      });

      async.series(checkJobs, done);
    });

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
        body: payload
      };

      utils.runWithLimit(api.elasticsearch.client, 'index', [query], done);
    });

    async.series(jobs, function(error){
      if(error){ return callback(error); }
      return callback(null, self.data);
    });
  };

  return edit;
};
