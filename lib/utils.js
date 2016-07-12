var utils = {};

utils.cleanGuid = function(guid){
  //elasticsearch hates '-' so we remove them
  if(!guid){ return null; }

  guid = guid.replace(/-/g, '');
  guid = guid.replace(/\s/g, '');
  return guid;
};

utils.prepareQuery = function(searchKeys, searchValues, start, end, dateField){
  var musts = [];
  var q, key, val;

  for(var i in searchKeys){
    q = {};
    key = searchKeys[i];
    val = searchValues[i];

    if(typeof(val) === 'string'){
      val = val.toLowerCase();
    }

    if(val === '_exists'){
      q['field'] = key;
      musts.push({ exists: q });
    }else if(val === '_missing'){
      q['field'] = key;
      musts.push({ missing: q });
    }else if(typeof val === 'string' && val.indexOf('*') >=0){
      q[key] = val;
      musts.push({ wildcard: q });
    }else{
      q[key] = val;
      musts.push({ term: q });
    }
  }

  if(start && end && dateField){
    var range = {};
    range[dateField] = {gte: start.getTime(), lte: end.getTime()};
    musts.push({range: range});
  }

  return musts;
};

utils.runWithLimit = function(api, client, method, args, callback){
  var combinedArgs = args.concat([function(error, a, b, c, d){
    api.elasticsearch.pendingOperations--;
    return callback(error, a, b, c, d);
  }]);

  api.elasticsearch.pendingOperations++;

  if(api.elasticsearch.pendingOperations <= api.config.elasticsearch.maxPendingOperations){
    client[method].apply(client, combinedArgs);
  }

  else if(api.config.elasticsearch.maxPendingOperationsBehavior === 'fail'){
    return callback(new Error('Too many pending ElasticSearch operations'));
  }

  else{
    setTimeout(function(){
      utils.runWithLimit(api, client, method, args, callback);
    }, api.config.elasticsearch.maxPendingOperationsSleep);
  }
};

utils.runWithLimitAndCache = function(api, client, method, args, callback){
  //TODO!
  utils.runWithLimit(api, client, method, args, callback);
};

module.exports = utils;
