'use strict';

module.exports = Channel;

function Channel() {
  return {
    buffer: [],
    consumers: [],
    closed: false
  };
}

const END = Channel.END = Symbol('END');
const KEEP_OPEN = Channel.KEEP_OPEN = Symbol('KEEP_OPEN');
const CLOSE_BOTH = Channel.CLOSE_BOTH = Symbol('CLOSE_BOTH');

Channel.put = (channel, value) => {
  if (channel.closed) return channel;

  if (value === END) channel.closed = true;

  channel.buffer.push(value);
  return runTick(channel);
};

Channel.take = (channel, callback) => {
  if (channel.closed && channel.buffer.length === 0) return channel;

  if (isFunction(callback)) channel.consumers.push(callback);

  return runTick(channel);
};

Channel.close = (channel) => {
  return Channel.put(channel, END);
};

Channel.pipe = (input, output, keepOpen = KEEP_OPEN, transform = identity) => {
  const consume = (value) => {
    if (!(keepOpen === KEEP_OPEN && value === END))
      Channel.put(output, transform(value));

    if (value !== END) Channel.take(input, consume);
  };

  Channel.take(input, consume);
  return output;
};

Channel.merge = (channels, output, keepOpen, transform) => {
  channels.forEach((channel) => Channel.pipe(channel, output, keepOpen, transform));
  return output;
};

Channel.mux = (input, channels, keepOpen, transform = identity) => {
  const consume = (value) => {
    if (!(keepOpen === KEEP_OPEN && value === END))
      channels.forEach((channel) => Channel.put(channel, transform(value)));

    if (value !== END) Channel.take(input, consume);
  };

  Channel.take(input, consume);
  return channels;
};

const runTick = (channel) => {
  if (!(channel.buffer.length !== 0 && channel.consumers.length !== 0)) {
    return channel;
  }

  const message = channel.buffer.shift();
  const consumer = channel.consumers.shift();

  setImmediate(consumer.bind(null, message));

  return runTick(channel);
};

const identity = (value) => value;

const isFunction = (fn) => ({}).toString.call(fn) === '[object Function]';
