var irc = require('./irc-proxy');
irc.join('#onug', function() {
  irc.privmsg('#onug', 'flaskepess');
});
irc.on('privmsg', function(from, to, message) {
  if (to[0] == '#') {
    irc.privmsg(to, from + ': ok!');
  }
})
