module.exports = {
  "settings": {
    "number_of_shards": parseInt(process.env.NUMBER_OF_SHARDS || 1),
    "number_of_replicas": parseInt(process.env.NUMBER_OF_REPLICAS || 0),
  },

  "mappings": {
    "person": {
      "properties": {
        "guid":        { "type": "string" },
        "source":      { "type": "string" },
        "email":       {
          "type" : "string",
          "index" : "not_analyzed"
        },
        "data":        { "type": "object" },
        "createdAt":   { "type":  "date"  },
        "updatedAt":   { "type":  "date"  }
      }
    }
  },

  "warmers" : {},

  "aliases" : {"people": {}}
};
