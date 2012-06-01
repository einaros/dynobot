var cp = require('child_process');
var IRC = require('irc.js');
var Service = require('./service');
var Channel = require('./channel');

var irc = new IRC('irc.freenode.net', 6667);
irc.connect('hestefest');
var service = new Service('irc', irc);
irc.on('connected', function() {
  var child = cp.fork('./child');
  var channel = new Channel(child);
  service.handle(channel);
  child.on('exit', function() {
    service.release(channel);
    channel.close();
  });
});
