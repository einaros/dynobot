// This rather convoluted example will join a channel, wait for a callback and then send a message to it.
//
// When a message is first seen on the channel, the app will go on to remove the 'privmsg' event handler (onPrivmsg).
// This does not cause garbage collection on the server, since the same handler is used by the 'notice' event.
//
// When a notice is then seen on the channel, the app will remove 'onPrivmsg' from the registered notice handlers as well
// At this point, the server's equivalent of 'onPrivmsg' no longer has any references held to it - and so the garbage collector
// will free it. This will result in a message sent to the client side proxy, which will go on to remove all references to 'onPrivmsg'
// within it as well. After that, 'onPrivmsg' will be garbage collected here on the client side as well. Distributed collection of sorts.
//
// Finally, five seconds after the above described notice call, the client will exit. When the client's channel shuts down on the server,
// it will go on to remove all remaining event handlers which were added through 'on'. In this case, that would be the bottom
// call of this file - the practically empty 'notice' handler.
//
// When this final handler is GC'd on the server all remains of the client will have been removed on the server side.

var irc = require('./irc-proxy');
irc.join('#onug', function() {
  irc.privmsg('#onug', 'meh');
});

var i = 0;
var onPrivmsg = function(from, to, message) {
  if (to[0] == '#') {
    irc.privmsg(to, from + ': ok!');
    if (++i == 1) irc.removeListener('privmsg', onPrivmsg);
    else if (i == 2) {
      irc.removeListener('notice', onPrivmsg);
      setTimeout(function() { process.exit(); }, 5000);
    }
  }
}

irc.on('privmsg', onPrivmsg);
irc.on('notice', onPrivmsg);
irc.on('notice', function() { console.log('notice'); });
