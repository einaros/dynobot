var assert = require('assert');
var weak = require('weak')

function Service(name, target) {
  this.name = name;
  this.target = target;
  this.perChannelState = {};
}

Service.prototype.handle = function(channel) {
  var channelState = this.perChannelState[channel.id] = {
    rememberedFunctions: {},
    cleanupHandlers: []
  }
  var self = this;
  channel.registerService(self.name, function(from, message, reply) {
    if (message.method) {
      var args = message.arguments;

      // Map function arguments to callbacks
      for (var i = 0, l = message.callbackArgumentIndexes.length; i < l; ++i) {
        var callbackIndex = message.callbackArgumentIndexes[i];
        var callbackId = args[callbackIndex];

        // Try reusing old callback
        if (channelState.rememberedFunctions[callbackId]) {
          args[callbackIndex] = channelState.rememberedFunctions[callbackId].func;
          continue;
        }

        // Create new callback
        var correlationToken = message.correlationToken;
        var lifetimeTracker = {};
        var name = message.method;
        function cb() {
          reply({
            what: 'callback',
            correlationToken: correlationToken,
            callbackId: callbackId,
            arguments: Array.prototype.slice.call(arguments, 0)
          });
        }
        var weakRef = weak(lifetimeTracker, function() {
          // console.log('releasing function, arg to %s', name);
          delete channelState.rememberedFunctions[callbackId];
          reply({
            what: 'release callback',
            correlationToken: correlationToken,
            callbackId: callbackId
          });
        });
        var lifetimeTrackedCallback = cb.bind(lifetimeTracker);
        weakRef.func = lifetimeTrackedCallback;
        args[callbackIndex] = lifetimeTrackedCallback;
        channelState.rememberedFunctions[callbackId] = weakRef;
        lifetimeTracker = null;
      }

      // Track calls to EventEmitter like apis, for on-disconnect kill
      if (message.method == 'on' && message.arguments.length > 1 && typeof message.arguments[1] == 'function') {
        var type = message.arguments[0];
        var id = message.callbackArgumentIndexes[1];
        channelState.cleanupHandlers.push(function() {
          var weakRef = channelState.rememberedFunctions[callbackId];
          if (self.target && self.target.removeListener && weakRef && weakRef.func) {
            self.target.removeListener(type, weakRef.func);
          }
        });
      }

      // Call api
      self.target[message.method].apply(self.target, message.arguments);
    }
  });
}

Service.prototype.release = function(channel) {
  var channelState = this.perChannelState[channel.id];
  if (!channelState) return;
  if (channelState.cleanupHandlers.length > 0) {
    channelState.cleanupHandlers.forEach(function(func) { func(); });
  }
  delete this.perChannelState[channel.id];
}

module.exports = Service;