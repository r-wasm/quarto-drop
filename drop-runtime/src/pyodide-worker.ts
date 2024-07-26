import * as Comlink from 'comlink';
import { loadPyodide, PyodideInterface } from 'pyodide';
import type { TerminalInterface } from './App';

declare global {
  interface Window {
    pyodide?: PyodideInterface;
    _writeConsole?: (line: string) => Promise<void>;
    _complete?: (source: string) => Promise<[string[], number]>;
  }
}

export type PyodideConsole = {
  complete: (source: string) => Promise<[string[], number]>;
  writeConsole: (line: string) => Promise<void>;
}

export type PyodideWorker = {
  init: typeof init;
  initPyConsole: typeof init;
  installPackages: typeof installPackages;
  writeConsole: typeof writeConsole;
  complete: typeof complete;
}

async function init(options) {
  self.pyodide = await loadPyodide(options) as PyodideInterface;
  self.pyodide.registerComlink(Comlink);
  return Comlink.proxy(self.pyodide);
}

async function installPackages(packages) {
  await self.pyodide.loadPackage("micropip");
  const micropip = self.pyodide.pyimport("micropip");
  await Promise.all(packages.map((pkg) => () => micropip.install(pkg)))
  await micropip.install("matplotlib");
  micropip.destroy();
}

async function initPyConsole(terminalInterface: TerminalInterface) {
  let locals = self.pyodide.toPy({
    stdout: (line) => terminalInterface.write(line),
    stderr: (line) => terminalInterface.write(line)
  });
  const [pyRepr, pyConsole] = await self.pyodide.runPythonAsync(`
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

  self._writeConsole = (line: string) => {
    return pyConsole.push(line + "\n").then((result) => {
      if (result) {
        const output = pyRepr(result);
        terminalInterface.println(output);
      }
    }).catch((error) => {
      terminalInterface.println(error.message);
    });
  };

  self._complete = (source: string) => {
    const result = pyConsole.complete(source);
    if (result) {
      return result.toJs();
    }
  }
}

function writeConsole(line: string) {
  return self._writeConsole(line);
}

function complete(source: string) {
  return self._complete(source);
}

Comlink.expose({
  init,
  initPyConsole,
  installPackages,
  writeConsole,
  complete,
});
