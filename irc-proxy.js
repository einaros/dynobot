var Proxy = require('./proxy');
var Channel = require('./channel');
var IRC = require('irc.js');

var channel = new Channel();
module.exports = new Proxy(IRC.prototype, 'irc', channel);
