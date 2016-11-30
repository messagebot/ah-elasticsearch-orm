var ES_VERSION = 5

if (process.env.ES_VERSION) {
  ES_VERSION = parseInt(process.env.ES_VERSION.split('.')[0])
}

var aggregatableStringType = 'keyword'
if (ES_VERSION !== 5) { aggregatableStringType = 'string' }

module.exports = {
  'settings': {
    'number_of_shards': parseInt(process.env.NUMBER_OF_SHARDS || 1),
    'number_of_replicas': parseInt(process.env.NUMBER_OF_REPLICAS || 0)
  },

  'mappings': {
    'person': {
      'properties': {
        'guid': { 'type': aggregatableStringType, 'required': true },
        'source': { 'type': aggregatableStringType, 'required': true },
        'email': {
          'type': 'string',
          'index': 'not_analyzed'
        },
        'data': { 'type': 'object', 'required': true },
        'name': { 'type': 'string', 'required': false },
        'createdAt': { 'type': 'date', 'required': true },
        'updatedAt': { 'type': 'date', 'required': true }
      }
    }
  },

  'warmers': {},

  'aliases': {'people': {}}
}
