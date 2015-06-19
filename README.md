# Channel4
Dead simple communicating sequential processes for Javascript (like Clojurescript core.async, or Go channels).

```shell
npm install channel4
```

## Usage

```js
let channel = Channel();
Channel.put(channel, 'World!');
Channel.take(channel, (value) => {
  console.log('Hello ');
});

// prints `Hello World!`
```

## Motivation
Consider the following code:

```js
const listenerFn = (event) => {
  event.preventDefault();
  doSomething(event);
};

document.querySelector('button').addEventListener('click', listenerFn);
```

There's a one-to-one relationship between the producer `addEventListener` and
the consumer `listenerFn`. Also the producer knows 1) there's a single listener
attached, 2) how the data is feeded 3) when the data is going to be processed.
Adding a second listener introduces some challenges:

```js
document.querySelector('button').addEventListener('click', (e) => {
  listenerFn() && otherListenerFn();
});

// or

document.querySelector('button').addEventListener('click', listenerFn);
document.querySelector('button').addEventListener('click', otherListenerFn);
```

It's immediately obvious that this couples the producer and consumer: when you
introduce another consumer, the producer has to change accordingly.

This is poor separation of concerns.

But what if you could decouple consumers from producers? What if the producer
could send the message without the need to worry about who's consuming it? What
if the consumer could consume messages at its own peace?

You won't need to fiddle with such poor code, that's for sure. Decoupling would
also lead to better and easier testing.

As you might have guessed by now channels can help you decouple producers and
consumers. The decoupling is obtained through a simple queue.

The producer places items of work on the queue for later processing.
The consumer is free to remove the work item from the queue at any time.

Producer and consumer only have to know about the channel to communicate.
Also, multiple producers can put values for multiple consumers to take.

```js
let channel = Channel();
document.querySelector('button')
  .addEventListener('click', Channel.put.bind(null, channel));

channel.take(channel, (value) => console.log('Hello'));
channel.take(channel, (value) => console.log('World'));
```

In the example above, `addEventListener` isn't aware that two consumers are
consuming items from the channel.

```js
let channel = Channel();
document.querySelector('a')
  .addEventListener('click', Channel.put.bind(null, channel));
document.querySelector('button')
  .addEventListener('click', Channel.put.bind(null, channel));

channel.take(channel, (value) => console.log('Hello'));
```

In this other example, the consumer isn't aware that multiple producers are
placing items of work on the queue.

## API

### Channel.put :: (channel, a) -> channel

Put a value into a channel and return the channel.
The result in a noop when called on closed channel.

```js
let channel = Channel();
Channel.put(channel, 46);
```

### Channel.take :: (channel, (a) -> b) -> channel

Take values from the channel and fire the callback.
The result in a noop when called on closed channel.

```js
let channel = Channel();
Channel.take(channel, console.log.bind(console, 'received: '));
Channel.put(channel, 47);

// prints `received: 47`
```

### Channel.close :: (channel) -> channel

Close the current channel. This is a shorthand for `Channel.put(channel,
Channel.END)`.

```js
let channel = Channel();
Channel.take(channel, (value) => {
  if (value === Channel.END) console.log('Closed!');
});
Channel.close(channel);

// prints `Closed!`

...

Channel.put(channel, 46); // has no effect
Channel.take(channel, () => ()); // callback will never fire
```

### Channel.pipe :: (input, output, KEEP_OPEN, (a) -> b) -> output

Pipe all the incoming values from the input to the output channel. If the input
channel is closed, the output channel is kept open unless it is specified
otherwise. You can apply a transformation function while piping the values.

```js
let input = Channel();
let output = Channel();
Channel.pipe(input, output, Channel.KEEP_OPEN, (x) => x/2);
Channel.take(output, console.log.bind(console, 'received: '))
Channel.put(input, 44);

// prints: `received: 22`
```

### Channel.merge :: ([channel], output, KEEP_OPEN, (a) -> b) -> output

Merge all values from an array of channels into the output. If one of the input
channels is closed, the output channel is kept open unless it is specified
otherwise. You can apply a transformation function while mergin the values.

```js
let one = Channel();
let two = Channel();
let output = Channel();
Channel.merge([one, two], output);
Channel.take(output, console.log.bind(console, 'received: '));
Channel.take(output, console.log.bind(console, 'received: '));
Channel.put(one, 1);
Channel.put(two, 2);

// prints `received: 1` and `received 2`
```

### Channel.END

Emitted from the channel on close.

```js
let channel = Channel();
Channel.take(channel, (value) {
  if (value === END) console.log('Closed!');
})
Channel.put(channel, Channel.END);

// prints `Closed!`
```

### Channel.KEEP_OPEN

Keep the output channel open during a `Channel.pipe` or `Channel.merge` as
a response to an incoming `Channel.END` value.

```js
let input = Channel();
let output = Channel();
Channel.pipe(input, output, Channel.KEEP_OPEN);
Channel.take(output, console.log.bind(console, 'received: '))
Channel.put(input, Channel.END);
Channel.put(output, 44);

// prints: `received: 44`
```

### Channel.CLOSE_BOTH

Close the output channel when the input during a `Channel.pipe` or
`Channel.merge` received a `Channel.end` value.

```js
let input = Channel();
let output = Channel();
Channel.pipe(input, output, Channel.CLOSE_BOTH);
Channel.take(output, (value) => {
  if (value === CLOSED) console.log('Closed!');
});
Channel.put(input, Channel.END);

// prints: `Closed!`
```

## Resources

This project is heavily inspired by:

- [CSP and transducers in JavaScript](http://phuu.net/2014/08/31/csp-and-transducers.html)
- [Taming the Asynchronous Beast with CSP Channels in JavaScript](http://jlongster.com/Taming-the-Asynchronous-Beast-with-CSP-in-JavaScript)
- [Go-flavored JavaScript](http://johntantalo.com/blog/go-flavored-javascript/)
- [Raynos/value-event](https://github.com/Raynos/value-event)
- [The Producer Consumer Pattern](http://java.dzone.com/articles/producer-consumer-pattern)
