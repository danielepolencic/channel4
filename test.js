var test = require('tape');
var Channel = require('./channel.js');

test('Channel() creates a new channel', (assert) => {
  assert.plan(3);

  const channel = Channel();
  assert.deepEqual(channel.buffer, []);
  assert.deepEqual(channel.consumers, []);
  assert.ok(!channel.closed);
});

test('Channel.put puts a value into a channel', (assert) => {
  assert.plan(1);

  let channel = Channel();
  Channel.put(channel, 42);
  assert.deepEqual(channel.buffer, [42]);
});

test('Channel.put puts END into a channel', (assert) => {
  assert.plan(1);

  let channel = Channel();
  Channel.put(channel, 52);
  Channel.put(channel, Channel.END);
  Channel.put(channel, 53);
  assert.deepEqual(channel.buffer, [52, Channel.END]);
});

test('Channel.take takes a value from a channel', (assert) => {
  assert.plan(1);

  let channel = Channel();
  Channel.put(channel, 43);
  Channel.take(channel, (value) => assert.equal(value, 43));
});

test('Channel.take takes values from a channel', (assert) => {
  assert.plan(2);

  let channel = Channel();
  let i = 0;
  Channel.put(channel, 91);
  Channel.put(channel, 92);
  Channel.take(channel, sequential(
    assert.equal.bind(null, 91),
    assert.equal.bind(null, 92)
  ));
});

test('Channel.take ignores values from closed channel with consumers', (assert) => {
  assert.plan(2);

  let channel = Channel();
  Channel.take(channel, (value) => {
    Channel.take(channel, () => assert.fail('shoul not have been called'));
    assert.strictEqual(value, Channel.END);
  });
  Channel.close(channel);
  Channel.put(channel, 57);
  assert.deepEqual(channel.buffer, []);
});

test('Channel.take ignores values from closed channel with values', (assert) => {
  assert.plan(4);

  let channel = Channel();
  let i = 0;
  Channel.put(channel, 75);
  Channel.close(channel);
  assert.deepEqual(channel.buffer, [75, Channel.END]);
  Channel.take(channel, sequential(
    assert.equal.bind(null, 75),
    (value) => {
      assert.strictEqual(value, Channel.END);
      assert.deepEqual(channel.buffer, []);
    }
  ));
});

test('Channel.close closes a channel', (assert) => {
  assert.plan(2);

  let channel = Channel();
  Channel.close(channel);
  Channel.put(channel, 58);
  Channel.take(channel, (value) => assert.strictEqual(value, Channel.END));
  assert.deepEqual(channel.buffer, []);
});

test('Channel.pipe pipes values from input to output', (assert) => {
  assert.plan(1);

  let input = Channel();
  let output = Channel();
  Channel.pipe(input, output);
  Channel.put(input, 44);
  Channel.take(output, (value) => assert.equal(value, 44));
});

test('Channel.pipe transforms piped values', (assert) => {
  assert.plan(1);

  let input = Channel();
  let output = Channel();
  Channel.pipe(input, output, Channel.KEEP_OPEN, ((x) => x / 5));
  Channel.put(input, 45);
  Channel.take(output, (value) => assert.equal(value, 9));
});

test('Channel.pipe pipes END to input and output', (assert) => {
  assert.plan(3);

  let input = Channel();
  let output = Channel();
  Channel.pipe(input, output, Channel.CLOSE_BOTH);
  Channel.put(input, Channel.END);
  Channel.take(output, (value) => {
    Channel.put(input, 59);
    Channel.put(output, 59);
    assert.strictEqual(value, Channel.END);
    assert.deepEqual(input.buffer, []);
    assert.deepEqual(output.buffer, []);
  });
});

test('Channel.pipe does not pipe values to a closed output channel', (assert) => {
  assert.plan(2);

  let input = Channel();
  let output = Channel();
  Channel.pipe(input, output);
  Channel.close(output);
  Channel.put(input, 201);
  Channel.put(output, 201);
  Channel.take(output, (value) => assert.strictEqual(value, Channel.END));
  assert.deepEqual(output.buffer, []);
});

test('Channel.pipe does not pipe END to output', (assert) => {
  assert.plan(1);

  let input = Channel();
  let output = Channel();
  Channel.pipe(input, output);
  Channel.put(input, Channel.END);
  Channel.put(output, 202);
  Channel.take(output, (value) => assert.equal(value, 202));
  Channel.take(input, () => assert.fail('should not have been called'));
});

test('Channel.merge merges multiple channels into one', (assert) => {
  assert.plan(2);

  let one = Channel();
  let two = Channel();
  let i = 0;
  let output = Channel();
  Channel.merge([one, two], output);
  Channel.take(output, sequential(
    assert.equal.bind(null, 46),
    assert.equal.bind(null, 47)
  ));

  Channel.put(one, 46);
  Channel.put(two, 47);
});

const sequential = (...fns) => {
  let callCount = 0;
  return (...args) => {
    fns[callCount].apply(void 0, args);
    callCount += 1;
  }
};
