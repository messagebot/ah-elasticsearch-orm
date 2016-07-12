var async = require('async');
var utils = require(__dirname + '/../utils.js');

var edit = function(callback){
  var self = this;
  var jobs = [];
  
  if(!self.data.guid){ return callback(new Error('guid is required')); }
  if(!self.index){     return callback(new Error('index is required')); }

  jobs.push(function(done){
    var payload;
    try{
      payload = self.prepareData();
    }catch(e){ return callback(e); }

    self.hydrate(function(error){
      if(error){ return done(error); }

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
  });

  jobs.push(function(done){
    var payload;
    try{
      payload = self.prepareData();
    }catch(e){ return callback(e); }

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
