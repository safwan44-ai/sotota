import readline from "node:readline";

// Asks a normal question and returns the answer.
export function askLine(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Asks for a password WITHOUT showing what you type.
export function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error("Please run this in a normal terminal window."));
      return;
    }

    // Hide typing FIRST, then show the question.
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    process.stdout.write(question);

    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };

    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          finish();
          process.exit(1); // Ctrl + C
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1); // Backspace
          continue;
        }
        if (ch >= " ") value += ch;
      }
    };

    stdin.on("data", onData);
  });
}