var utils = require(__dirname + '/../utils.js');

var hydrate = function(callback){
  var self = this;

  if(!self.data.guid){ return callback(new Error('guid is required')); }
  if(!self.index){     return callback(new Error('index is required')); }

  // TODO: Can we use the GET api rather than a search?
  // You cannot GET over an alias...

  var query = {
    alias: self.alias,
    type: self.type,
    body: {
      query: { ids: { values: [self.data.guid] } }
    }
  };

  utils.runWithLimit(self.api, self.api.elasticsearch.client, 'search', [query], function(error, data){
    if(error){ return callback(error); }
    if(data.hits.hits.length === 0){ return callback(new Error(self.type + ' (' + self.data.guid + ') not found')); }
    if(data.hits.hits.length > 1){ return callback(new Error(self.type + ' (' + self.data.guid + ') has more than one instace')); }

    self.data = data.hits.hits[0]._source;

    if(self.data.createdAt){ self.data.createdAt = new Date(self.data.createdAt); }
    if(self.data.updatedAt){ self.data.updatedAt = new Date(self.data.updatedAt); }

    //TODO: date-ify all hash data in the response.  We can do a regexp match?

    self.data._index = data.hits.hits[0]._index;
    callback(null, self.data);
  });
};

module.exports = hydrate;
