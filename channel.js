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

Channel.take = (channel, ...fns) => {
  if (channel.closed && channel.buffer.length === 0) return channel;

  const takeOneMore = (value) => {
    if (value !== END) Channel.take.apply(void 0, [channel].concat(fns));
    return value;
  };

  const consumer = pipeline([takeOneMore].concat(fns));
  channel.consumers.push(consumer);

  return runTick(channel);
};

Channel.close = (channel) => {
  return Channel.put(channel, END);
};

Channel.pipe = (input, output, keepOpen = KEEP_OPEN, transform = identity) => {
  Channel.take(input, (value) => {
    if (!(keepOpen === KEEP_OPEN && value === END))
      Channel.put(output, transform(value));
  });
  return output;
};

Channel.merge = (channels, output, keepOpen, transform) => {
  channels.forEach((channel) => Channel.pipe(channel, output, keepOpen, transform));
  return output;
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

const pipeline = (fns) => {
  return (seed) => {
    return fns.reduce((previous, current) => current.call(void 0, previous), seed);
  }
};
