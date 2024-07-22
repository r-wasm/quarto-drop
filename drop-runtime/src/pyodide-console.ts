import { PyodideInterface } from "pyodide";
import { TerminalInterface } from "./App";

export type PyodideConsole = {
  pyodide: PyodideInterface;
  complete: (source: string) => [string[], number];
  writeConsole: (line: string) => Promise<void>;
}

export async function initPyConsole(
  pyodidePromise: Promise<PyodideInterface>,
  terminalInterface: TerminalInterface
) {
  const pyodide = await pyodidePromise;

  let locals = pyodide.toPy({
    stdout: (line) => terminalInterface.write(line),
    stderr: (line) => terminalInterface.write(line)
  });
  const [pyRepr, pyConsole] = await pyodide.runPythonAsync(`
    import pyodide.console
    pyConsole = pyodide.console.PyodideConsole(
      stdout_callback=stdout,
      stderr_callback=stderr
    )
    [
      pyodide.console.repr_shorten,
      pyConsole
    ]
  `, { locals });

  const writeConsole = (line: string) => {
    return pyConsole.push(line + "\n").then((result) => {
      if (result) {
        const output = pyRepr(result);
        terminalInterface.println(output);
      }
    }).catch((error) => {
      terminalInterface.println(error.message);
    });
  };

  const complete = (source: string) => {
    const result = pyConsole.complete(source);
    if (result) {
      return result.toJs();
    }
  }

  return {
    pyodide,
    complete,
    writeConsole,
  }
}
