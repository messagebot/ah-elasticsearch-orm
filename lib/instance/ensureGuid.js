var uuid  = require('node-uuid');
var utils = require(__dirname + '/../utils.js');

var ensureGuid = function(){
  var self = this;
  if(!self.data.guid){
    self.data.guid = utils.cleanGuid( uuid.v4() );
  }
  return self.data.guid;
};

module.exports = ensureGuid;
