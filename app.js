var cp = require('child_process');
var weak = require('weak')
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
        var correlationToken = message.correlationToken;
        var replyTo = message.replyTo;
        var lifeTracker = {};
        function cb() {
          child.send({
            to: replyTo,
            what: 'callback',
            correlationToken: correlationToken,
            callbackIndex: callbackIndex,
            arguments: Array.prototype.slice.call(arguments, 0)
          });
        }
        weak(lifeTracker, function() {
          child.send({
            to: replyTo,
            what: 'release callback',
            correlationToken: correlationToken,
            callbackIndex: callbackIndex
          });
        });
        args[functionIndex] = cb.bind(lifeTracker);
        lifeTracker = null;
      }
      irc[message.ircCall].apply(irc, message.arguments);
    }
  });
});
