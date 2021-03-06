var _ = require('lodash')
var Async = require('async')
var Parambulator = require('parambulator')

module.exports = {
  findNextState: function (command, err, data, done) {
    var next = command.next
    if (err) {
      return done(null, next.error)
    }

    if (_.isString(next.success)) {
      return done(null, next.success)
    }
    else if (_.isArray(next.success)) {
      var lst = []
      for (var i in next.success) {
        lst.push({
          schema: next.success[i].schema,
          state: next.success[i].state,
          response: data
        })
      }
      Async.map(lst, validate, function (err, responses) {
        if (err) {
          return done()
        }

        for (var i in responses) {
          if (responses[i]) {
            return done(null, responses[i])
          }
        }
        return done(null, next.error)
      })
    }

    function validate (data, done) {
      var paramcheck = Parambulator(data.schema)
      paramcheck.validate(data.response, function (err) {
        if (err) {
          return done()
        }
        return done(null, data.state)
      })
    }
  },
  change: function (context, nextState) {
    console.log('Change state', context.current_status, '\t--->\t', nextState)
    context.current_status = nextState
  }
}
