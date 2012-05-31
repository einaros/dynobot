var cp = require('child_process');
var IRC = require('./node_modules/irc/irc').IRC;

var irc = new IRC('irc.freenode.net', 6667);
irc.connect('hestefest');
irc.on('connected', function() {
  var child = cp.fork('./child');
  child.on('message', function(message) {
    console.log('app message', message);
    if (message.ircCall) {
      var args = message.arguments;
      for (var i = 0, l = message.functionArgumentIndexes.length; i < l; ++i) {
        var functionIndex = message.functionArgumentIndexes[i];
        var callbackIndex = args[functionIndex];
        var cb = function() {
          child.send({
            what: 'callback',
            to: 'irc-proxy',
            correlationToken: message.correlationToken,
            callbackIndex: callbackIndex,
            arguments: arguments
          });
        }
        args[functionIndex] = cb;
      }
      irc[message.ircCall].apply(irc, message.arguments);
    }
  });
});

