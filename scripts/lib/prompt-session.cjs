const readline = require('readline');
const { Writable } = require('stream');

function createMutedOutput(output) {
  let muted = false;

  const mutedOutput = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) {
        output.write(chunk, encoding);
      }
      callback();
    },
  });

  mutedOutput.isTTY = output.isTTY;
  mutedOutput.columns = output.columns;
  mutedOutput.rows = output.rows;
  mutedOutput.getColorDepth = output.getColorDepth?.bind(output);
  mutedOutput.hasColors = output.hasColors?.bind(output);

  return {
    mutedOutput,
    setMuted(value) {
      muted = value;
    },
  };
}

function createPromptSession(streams = {}) {
  const input = streams.input || process.stdin;
  const output = streams.output || process.stdout;
  const { mutedOutput, setMuted } = createMutedOutput(output);

  const rl = readline.createInterface({
    input,
    output: mutedOutput,
    terminal: Boolean(input.isTTY && output.isTTY),
  });

  function question(prompt, defaultValue = '') {
    return new Promise((resolve) => {
      const displayPrompt = defaultValue
        ? `${prompt} [${defaultValue}]: `
        : `${prompt}: `;

      rl.question(displayPrompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  function questionHidden(prompt) {
    return new Promise((resolve) => {
      output.write(`${prompt}: `);
      setMuted(true);

      rl.question('', (answer) => {
        setMuted(false);
        output.write('\n');
        resolve(answer);
      });
    });
  }

  return {
    close() {
      rl.close();
    },
    question,
    questionHidden,
  };
}

module.exports = {
  createPromptSession,
};
