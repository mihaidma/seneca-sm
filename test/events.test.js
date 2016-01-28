'use strict'

var Async = require('async')
var _ = require('lodash')

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var suite = lab.suite
var test = lab.test
var before = lab.before
var Code = require('code')
var expect = Code.expect

var Util = require('./util.js')

suite('test local and global after state change events', function () {
  var seneca

  before({}, function (done) {
    Util.init({}, function (err, si) {
      expect(err).to.not.exist()

      seneca = si
      done()
    })
  })

  function verifyState(state, smName, callback) {
    seneca.act('role:' + smName + ', get:context', function (err, context) {
      expect(err).to.not.exist()
      expect(context).to.exist()
      expect(context.current_status).to.equal(state)

      callback(err)
    })
  }

  test('test global after state change event', function (done) {
    var afterEventRaised = false

    // action to be called by the global after state change event pattern from config
    seneca.add({role: 'transport', execute: 'after_state_change'}, function (args, done) {
      afterEventRaised = true

      if (args.shouldFail) {
        return done('Some error')
      }
      done(null, {data: 'OK', after: true})
    })

    Async.series({
      create_instance: function (callback) {
        seneca.act("role: 'sm', create: 'instance'", Util.config, function (err) {
          expect(err).to.not.exist()

          callback(err)
        })
      },
      init: function (callback) { verifyState('INIT', Util.config.name, callback) },
      after_event_trigger: function (callback) {
        // go to the CONNECTED state, this fires the global after state change event pattern
        var loadState = 'CONNECTED'
        seneca.act('role: ' + Util.config.name + ', load: state', {sm_name: Util.config.name, state: loadState}, function (err, context) {
          expect(context).to.exist()
          expect(context.current_status).to.equal(loadState)

          callback(err)
        })
      },
      notconfigured: function (callback) { verifyState('CONNECTED', Util.config.name, callback) },
      verify_after_event: function (callback) {
        expect(afterEventRaised).to.be.true()

        callback()
      }
    },
    function (err, results) {
      expect(err).to.not.exist()
      done()
    })
  })

  test('test local after state change event', function (done) {
    var localAfterEventRaised = false

    // actions to be called by the global after state change event patterns from config
    seneca.add({role: 'transport', execute: 'after_notconfigured_state_change'}, function (args, done) {
      localAfterEventRaised = true

      if (args.shouldFail) {
        return done('Some error')
      }
      done(null, {data: 'OK', after_notconfigured: true})
    })
    var sm2Config = _.clone(Util.config)
    sm2Config.name = sm2Config.name + '1'

    Async.series({
      create_instance: function (callback) {
        seneca.act("role: 'sm', create: 'instance'", sm2Config, function (err) {
          expect(err).to.not.exist()

          callback(err)
        })
      },
      init: function (callback) { verifyState('INIT', sm2Config.name, callback) },
      after_event_trigger: function (callback) {
        // go to the NOT_CONFIGURED state, this fires the after state change event
        seneca.act("role: '" + sm2Config.name + "', cmd: 'execute'", {shouldFail: false}, function (err, data) {
          expect(err).to.not.exist()
          expect(data).to.exist()
          expect(data.connect).to.exist()
          callback(err)
        })
      },
      notconfigured: function (callback) { verifyState('NOT_CONFIGURED', sm2Config.name, callback) },
      verify_after_event: function (callback) {
        expect(localAfterEventRaised).to.be.true()

        callback()
      }
    },
    function (err, results) {
      expect(err).to.not.exist()
      done()
    })
  })
})
