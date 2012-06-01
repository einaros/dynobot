var uuid = require('node-uuid');

function Channel(bus) {
  this.id = uuid.v4();
  this.subscribers = {};
  this.bus = bus || process;
  this.connected = true;
  this.messageHandler = this.onMessage.bind(this);
  this.bus.on('message', this.messageHandler);
}

Channel.prototype.registerService = function(serviceName, messageHandler) {
  if (this.subscribers[serviceName]) throw new Error('duplicate service name');
  var self = this;
  this.subscribers[serviceName] = function(clientId, message) {
    messageHandler(clientId, message, function(response) {
      if (self.connected == false) return;
      self.bus.send({
        from: serviceName,
        to: clientId,
        payload: response
      });
    });
  };
}

Channel.prototype.registerClient = function(serviceName, messageHandler) {
  var id = uuid.v4();
  this.subscribers[id] = messageHandler;
  var self = this;
  return {
    send: function(message) {
      if (self.connected == false) return;
      self.bus.send({
        from: id,
        to: serviceName,
        payload: message
      });
    }
  }
}

Channel.prototype.close = function() {
  this.connected = false;
  this.bus.removeListener('message', this.messageHandler);
  this.bus = null;
  this.subscribers = {};
  this.messageHandler = null;
}

Channel.prototype.onMessage = function(message) {
  // console.log(message);
  if (message.to && this.subscribers[message.to]) {
    this.subscribers[message.to](message.from, message.payload);
  }
}

module.exports = Channel;