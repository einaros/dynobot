var IRC = require('./node_modules/irc/irc').IRC;

var storedCallbacks = {};
var correlationToken = 0;

function proxy(sourceObject, proxyName) {
  process.on('message', function(message) {
    if (message.to != proxyName) return;
    console.log('child message', message);
    if (message.what == 'callback') {
      var correlationToken = message.correlationToken;
      var callbacks = storedCallbacks[correlationToken];
      if (callbacks) {
        callbacks[message.callbackIndex].apply(null, message.arguments);
      }
    }
    else if (message.what == 'release callback') {
      var correlationToken = message.correlationToken;
      var callbacks = storedCallbacks[correlationToken];
      if (callbacks) {
        callbacks.splice(message.callbackIndex, 1);
        if (callbacks.length == 0) delete storedCallbacks[correlationToken];
      }
    }
  });

  function rememberCallbacksForRemoteCall(correlationToken, callbacks) {
    storedCallbacks[correlationToken] = callbacks;
  }

  function hook(name, proxyObject) {
    proxyObject[name] = function() {
      ++correlationToken;

      var args = Array.prototype.slice.call(arguments, 0);
      var callbacks = [];
      var functionArgumentIndexes = [];
      for (var i = 0, l = args.length; i < l; ++i) {
        var arg = args[i];
        if (typeof arg == 'function') {
          functionArgumentIndexes.push(i);
          args[i] = callbacks.length;
          callbacks.push(arg);
        }
      }
      rememberCallbacksForRemoteCall(correlationToken, callbacks);

      process.send({
        ircCall: name,
        arguments: args,
        functionArgumentIndexes: functionArgumentIndexes,
        correlationToken: correlationToken,
        replyTo: proxyName
      });
    }
  }

  var proxyObject = {};
  for (var name in sourceObject) hook(name, proxyObject);
  return proxyObject;
}

module.exports = proxy(IRC.prototype);
