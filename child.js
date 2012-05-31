var irc = require('./irc-proxy');
irc.join('#bitraf2', function() {
  console.log('onjoin!');
  irc.privmsg('#bitraf2', 'flaskepess');
});
