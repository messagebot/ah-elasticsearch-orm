var prepareData = function(){
  var self = this;
  var payload = { data: {} };

  for(var key in self.data){
    if(self.requiredFields.indexOf(key) >= 0 && (self.data[key] === null || self.data[key] === undefined)){
      throw new Error(key + ' is required');
    }else if(self.requiredFields.indexOf(key) >= 0){
      payload[key] = self.data[key];
    }else if(key !== '_index'){
      payload.data[key] = self.data[key];
    }
  }

  payload.updatedAt = new Date();

  return payload;
};

module.exports = prepareData;
