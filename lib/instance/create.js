var utils = require(__dirname + '/../utils.js');

var create = function(callback){
  var self = this;
  var searchKey;
  var searchValue;

  self.ensureGuid();
  if(!self.index){ return callback(new Error('index is required')); }

  var payload;
  try{
    payload = self.prepareData();
  }catch(e){ return callback(e); }

  if(self.data.createdAt){
    payload.createdAt = self.data.createdAt;
  }

  var doCreate = function(){
    var query = {
      index: self.index,
      type: self.type,
      id: self.data.guid,
      body: payload
    };

    utils.runWithLimit(self.api, self.api.elasticsearch.client, 'create', [query], callback);
  }

  // We need to ensure that none of the params this new instance has match an existing instance.
  // If they do, we need to turn this into a merge operation.
  // To match as loosely as possible, we'll only work with the first matching param... TODO?
  self.api.config.elasticsearch.uniqueFields[self.type].forEach(function(k){
    if(payload[k] && !searchKey){ searchKey = k; searchValue = payload[k]; }
    if(payload.data[k] && !searchKey){ searchKey = ('data.' + k); searchValue = payload.data[k]; }
  });

  if(!searchKey){ doCreate(); }
  else{
    self.api.elasticsearch.search(self.api, self.alias, [searchKey], [searchValue], 0, 1, null, function(error, results){
      if(error){ return callback(error); }
      if(results.length === 0){ doCreate(); }
      else{
        self.data.guid = results[0].guid;
        self.edit(callback);
      }
    });
  }
};

module.exports = create;
