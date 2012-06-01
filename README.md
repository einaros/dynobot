# The dynobot experiment #

## Goal ##

Host an `EventEmitter` like object with an additional API in a server process, and let a client process make calls against a proxy of it - as if it all happened in the client process. The fact that an object in another process is actually used should be *completely* transparent.

## How it works right now ##

This application will proxy function calls from a client process to a server server process.

Arguments of type `function` will be replaced with tokens, which allow the server to establish new callbacks on the server side. When these callbacks are called, the server will send a message back to the client - including the token - which enables the client to fire its intended callback. Effectively, cross-process calls *and* callbacks work.

Furthermore, event handlers can be registered by the client, and have them transparently be added on the server instead. These will work like the callbacks described above. Running `someProxy.on('event', function(arg) { console.log(arg); });` will cause the server to pass notifications back whenever `event` is raised on the proxied object.

In order to avoid leaking resources on the client side, weak references are used on the server. When a callback is no longer required, a situation which is left up to the garbage collector to detect, a message is passed to the client instructing it to release all handles to the callback. Should the client side of the callback as a result of this no longer be referenced by anything, it too will be garbage collected.

Next, to also enable the client to do something like:

```js
function handler() {}
proxyObject.on('foo', handler);
proxyObject.removeListener('foo', handler);
```

.. and consequently have the server garbage collect its side of the `handler` callback, references to the same function is detected on the client side, and an existing callback id will be passed, rather than a new one being created.

Finally, when a client disconnects, the server will attempt to automatically remove all EventEmitter-like handlers it has attached. This is done by taking note of all calls to `on` type functions, and passing them all to `removeListener` after the client has disconnected.

## See also ##

Notes in `child.js`.

## Todos ##

- Track function arguments passed recursively in arguments - from both sides.
- Write tests (rather than the current manual verification) of the relayed garbage collection info in effect.
