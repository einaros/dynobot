var IRC = require('./node_modules/irc/irc').IRC;

var storedCallbacks = {};
var correlationToken = 0;

process.on('message', function(message) {
  console.log('child message', message);
  if (message.to == 'irc-proxy' && message.what == 'callback') {
    var correlationToken = message.correlationToken;
    var callbacks = storedCallbacks[correlationToken];
    console.log(callbacks);
    if (callbacks) {
      delete storedCallbacks[correlationToken];
      callbacks[message.callbackIndex].call(null, message.arguments);
    }
  }
});

function rememberCallbacksForRemoteCall(correlationToken, callbacks) {
  storedCallbacks[correlationToken] = callbacks;
}

var proxy = {};
Object.keys(IRC.prototype).forEach(function(name) {
  if (IRC.prototype.hasOwnProperty(name)) {
    proxy[name] = function() {
      ++correlationToken;
      console.log('%d: %s was called', correlationToken, name);

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
        correlationToken: correlationToken
      });
    }
  }
});

module.exports = proxy;
