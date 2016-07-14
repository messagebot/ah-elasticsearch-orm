module.exports = {
  "settings": {
    "number_of_shards": parseInt(process.env.NUMBER_OF_SHARDS || 10),
    "number_of_replicas": parseInt(process.env.NUMBER_OF_REPLICAS || 0),
    "index":{
        "analysis":{
           "analyzer":{
              "analyzer_keyword":{
                 "tokenizer":"keyword",
                 "filter":"lowercase"
              }
           }
        }
     }
  },

  "mappings": {
    "person": {

      "dynamic_templates": [
        {
          "strings": {
            "match_mapping_type": "string",
            "mapping": {
              "type": "string",
              "analyzer":"analyzer_keyword",
            }
          }
        }
      ],

      "properties": {
        "guid":        { "type": "string"  },
        "source":      { "type": "string"  },
        "data":        { "type": "object" },
        "createdAt":   { "type":  "date" },
        "updatedAt":   { "type":  "date" }
      }
    }
  },

  "warmers" : {},

  "aliases" : {"people": {}}
};
