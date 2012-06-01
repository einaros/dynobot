var uuid = require('node-uuid');

function Proxy(sourceObject, serviceName, channel) {
  var storedFunctionArguments = {};

  this.pipe = channel.registerClient(serviceName, function(from, message) {
    if (message.what == 'callback') {
      var correlationToken = message.correlationToken;
      var callbacks = storedFunctionArguments[correlationToken];
      if (callbacks) {
        callbacks[message.callbackId].apply(null, message.arguments);
      }
    }
    else if (message.what == 'release callback') {
      var correlationToken = message.correlationToken;
      var callbacks = storedFunctionArguments[correlationToken];
      if (callbacks) {
        delete callbacks[message.callbackId];
        if (Object.keys(callbacks).length == 0) {
          // console.log('deleted all callbacks for correlationToken')
          delete storedFunctionArguments[correlationToken];
        }
      }
    }
  });

  function rememberCallbacksForRemoteCall(correlationToken, callbacks) {
    storedFunctionArguments[correlationToken] = callbacks;
  }

  // Looks for a specific function in the set of callbacks
  // which currently active on the server side. This allows us to reuse
  // shared functions, rather than spawn a new one.
  function lookupExistingFunctionId(func) {
    var tokens = Object.keys(storedFunctionArguments);
    for (var i = 0, l = tokens.length; i < l; ++i) {
      var token = tokens[i];
      var functions = storedFunctionArguments[token];
      var functionIds = Object.keys(functions);
      for (var j = 0, k = functionIds.length; j < k; ++j) {
        var functionId = functionIds[j];
        if (functions[functionId] == func) return functionId;
      }
    }
  }

  var self = this;
  function hookFunction(name) {
    self[name] = function() {
      var correlationToken = uuid.v4();
      var args = Array.prototype.slice.call(arguments, 0);
      var callbacks = {};
      var callbackArgumentIndexes = [];
      for (var i = 0, l = args.length; i < l; ++i) {
        var arg = args[i];
        if (typeof arg == 'function') {
          var callbackId = lookupExistingFunctionId(arg);
          if (!callbackId) {
            callbackId = uuid.v4();
            callbacks[callbackId] = arg;
          }
          args[i] = callbackId;
          callbackArgumentIndexes.push(i);
        }
      }
      if (Object.keys(callbacks).length > 0) rememberCallbacksForRemoteCall(correlationToken, callbacks);
      self.pipe.send({
        method: name,
        arguments: args,
        callbackArgumentIndexes: callbackArgumentIndexes,
        correlationToken: correlationToken,
      });
    }
  }
  for (var name in sourceObject) hookFunction(name);
}

module.exports = Proxy;