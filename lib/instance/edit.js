var async = require('async');
var utils = require(__dirname + '/../utils.js');

var edit = function(callback){
  var self = this;
  var jobs = [];
  var checkJobs = [];
  var payload;

  if(!self.data.guid){ return callback(new Error('guid is required')); }

  jobs.push(function(done){
    try{
      payload = self.prepareData();
    }catch(e){ return done(e); }
    done();
  });

  jobs.push(function(done){
    self.hydrate(done);
  });

  jobs.push(function(done){
    Object.keys(payload).forEach(function(k){
      if(self.requiredFields.indexOf(k) >= 0 && k !== 'data'){
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
        self.api.elasticsearch.search(self.api, self.alias, [k], [v], 0, 2, null, function(error, results){
          if(error){ return checkDone(error); }
          if(results.length === 0){ return checkDone(); }
          if(results.length === 1 && results[0].guid === self.data.guid){ return checkDone(); }
          return checkDone( new Error('uniqueFields:' + k + ' uniqueness violated via #' + results[0].guid) );
        });
      });
    }

    self.api.config.elasticsearch.uniqueFields[self.type].forEach(function(k){
      if(payload[k]){ jobBuilder(k, payload[k]); }
      if(payload.data[k]){ jobBuilder(('data.' + k), payload.data[k]); }
    });

    async.series(checkJobs, done);
  });

  jobs.push(function(done){
    var query = {
      index: self.data._index,
      type: self.type,
      id: self.data.guid,
      body: payload
    };

    utils.runWithLimit(self.api, self.api.elasticsearch.client, 'index', [query], done);
  });

  async.series(jobs, function(error){
    if(error){ return callback(error); }
    return callback(null, self.data);
  });
};

module.exports = edit;
