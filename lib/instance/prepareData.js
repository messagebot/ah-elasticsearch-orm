var prepareData = function(skipRequired){
  var self = this;
  var payload = { data: {} };

  if(!skipRequired){ skipRequired = false; }

  payload.updatedAt = new Date();
  payload.createdAt = payload.updatedAt;

  for(var key in self.data){
    if(self.requiredFields.indexOf(key) >= 0){
      payload[key] = self.data[key];
    }else if(key !== '_index'){
      payload.data[key] = self.data[key];
    }
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

module.exports = prepareData;
