module.exports = function(api){
  var prepareData = function(skipRequired){
    var self = this;
    var payload = { data: {} };

    if(!skipRequired){ skipRequired = false; }

    payload.updatedAt = new Date();

    for(var key in self.data){
      if(self.topLevelFields.indexOf(key) >= 0){
        payload[key] = self.data[key];
      }else if(key !== '_index'){
        payload.data[key] = self.data[key];
      }
    }

    if(!payload.createdAt){
      payload.createdAt = payload.updatedAt;
    }

    if(!skipRequired){
      self.requiredFields.forEach(function(req){
        if(payload[req] === undefined || payload[req] === null){
          throw new Error(req + ' is a required field');
        }
      });
    }

    return payload;
  };

  return prepareData;
};
