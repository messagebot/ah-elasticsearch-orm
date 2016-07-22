var async = require('async');

var utils       = require(__dirname + '/utils.js');
var prepareData = require(__dirname + '/instance/prepareData.js');
var ensureGuid  = require(__dirname + '/instance/ensureGuid.js');
var create      = require(__dirname + '/instance/create.js');
var edit        = require(__dirname + '/instance/edit.js');
var hydrate     = require(__dirname + '/instance/hydrate.js');
var del         = require(__dirname + '/instance/del.js');

var elasticsearchModel = function(api, type, guid, index, alias){
  this.api   = api;
  this.type  = type;
  this.index = index;
  this.alias = alias;
  this.data  = {
    guid: utils.cleanGuid(guid) || null
  };
  this.requiredFields = [];
  this.topLevelFields = [];
};

elasticsearchModel.prototype.prepareData = prepareData;
elasticsearchModel.prototype.ensureGuid  = ensureGuid;
elasticsearchModel.prototype.create      = create;
elasticsearchModel.prototype.edit        = edit;
elasticsearchModel.prototype.hydrate     = hydrate;
elasticsearchModel.prototype.del         = del;

module.exports = elasticsearchModel;
