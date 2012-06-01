var irc = require('./irc-proxy');
irc.join('#onug', function() {
  irc.privmsg('#onug', 'flaskepess');
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
