var uuid  = require('node-uuid');

module.exports = function(api){
  var utils = require(__dirname + '/../utils.js')(api);

  var ensureGuid = function(){
    var self = this;
    if(!self.data.guid){
      self.data.guid = utils.cleanGuid( uuid.v4() );
    }
    return self.data.guid;
  };

  return ensureGuid;
};
