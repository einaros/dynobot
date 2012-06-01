This application will proxy function calls from a client process to a server server process.

Arguments of type `function` will be replaced with tokens, which allow the server to establish new callbacks on the server side. When these callbacks are called, the server will send a message back to the client - including the token - which enables the client to fire its intended token. Effectively, cross-process calls *and* callbacks work.

Furthermore, event handlers can be registered from the client on the server - these will work like the callbacks described above. There's no call count limit on these cross process callbacks.

In order to avoid leaking resources on the client side, weak references are used on the server. When a callback is no longer required, a situation which is left up to the garbage collector to detect, a message is passed to the client instructing it to release all handles to its side of the callback. Should the client side of the callback as a result of this no longer be referenced by anything, it too will be garbage collected.

To also enable the client to do something like:

```js
function handler() {}
proxyObject.on('foo', handler);
proxyObject.removeListener('foo', handler);
```

.. and consequently have the server garbage collect its side of the `handler` callback, references to the same function is detected on the client side, and an existing callback id will be passed rather than a new one.

Finally, when a client disconnects, the server will attempt to automatically remove all EventEmitter-like handlers it has attached. This is done by taking note of all calls to `on` type functions, and passing them all to `removeListener` after the client has disconnected.