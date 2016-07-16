var urls = process.env.ELASTICSEARCH_URLS ? process.env.ELASTICSEARCH_URLS.split(',') : ['http://localhost:9200']

exports.default = {
  elasticsearch: function(api){
    return {
      // what are the elasticsearch server's URL(s)?
      urls: urls,

      // where are the alias/model files located in this project?
      indexDefinitions: api.projectRoot + '/db/elasticsearch/indexes',

      // how many pending ES operations should this server allow before taking a failure action?
      maxPendingOperations: 1000,

      // ['fail', 'delay']
      // if there are too many pending ES operations, what should I do with the request?
      maxPendingOperationsBehavior: 'fail',
      // if maxPendingOperationsBehavior === 'delay', how long should we wait before trying again (ms)?
      maxPendingOperationsSleep: 500,

      // Aggregate methods (search. scroll, etc) can have thier results cached.
      // If you don't provide this option to your query, the default defined here will be used (ms)/
      cacheTime: (1000 * 10),

      // When creating a new instance of an ElasticsSearch Model, we ensure that there is not already an instnace with these "unique keys"
      // This is done by fist searching for instances of the same type with these keys
      // These uniqueFields can be either at the top level of your object or part of the data hash
      // If an object is found, a failure will be returned
      uniqueFields: {
        person: [
          'email',
          'guid',
        ]
      },

      // Logger options for the elasticsearch client
      // More Information @ https://github.com/elastic/elasticsearch-js
      log: {
        type: 'file',
        level: 'info',
        path: api.projectRoot + '/log/elasticsearch-' + api.env + '.log'
      }
    };
  }
};
