import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import Terminal from './components/Terminal';
import Editor from './components/Editor';
import Plot from './components/Plot';
import { Readline } from 'xterm-readline';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { WebR } from 'webr';
import { loadPyodide } from 'pyodide';
import { initPyConsole } from './pyodide-console';
import type { CanvasMessage } from 'webr/dist/webR/webr-chan';
import './App.css';

export interface TerminalInterface {
  println: Readline['println'];
  read: Readline['read'];
  write: Readline['write'];
}

export interface PlotInterface {
  newPlot: () => void;
  drawImage: (img: ImageBitmap) => void;
}

const terminalInterface: TerminalInterface = {
  println: (msg: string) => { console.log(msg); },
  read: () => Promise.reject(new Error('Unable to read from terminal.')),
  write: (msg: string) => { console.log(msg); },
};

const plotInterface: PlotInterface = {
  newPlot: () => { return; },
  drawImage: () => {
    throw new Error('Unable to plot, plotting not initialised.');
  },
};

function handleCanvasMessage(msg: CanvasMessage) {
  if (msg.data.event === 'canvasImage') {
    plotInterface.drawImage(msg.data.image);
  } else if (msg.data.event === 'canvasNewPage') {
    plotInterface.newPlot();
  }
}

export function startWebRApp(elem: HTMLDivElement, packages: string[] = []) {
  const webR = new WebR();

  function App() {
    return (
      <div className='app'>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={10}>
            <PanelGroup direction="vertical">
              <Editor webR={webR} terminalInterface={terminalInterface} />
              <PanelResizeHandle />
              <Terminal webR={webR} terminalInterface={terminalInterface} />
            </PanelGroup>
          </Panel>
          <PanelResizeHandle />
          <Plot webR={webR} plotInterface={plotInterface} />
        </PanelGroup>
      </div>
    );
  }
  const root = ReactDOM.createRoot(elem);
  root.render(<StrictMode><App /></StrictMode>);

  void (async () => {
    await webR.init();
    await webR.evalRVoid(`
      webr::canvas_install(
        width = getOption("webr.fig.width", 504),
        height = getOption("webr.fig.height", 504)
      )
      webr::shim_install()
      options(pager = function(files, ...) {
        writeLines(gsub(".[\b]", "", readLines(files)))
      })
    `);

    // Install packages
    await Promise.all(packages.map((pkg) => webR.installPackages(pkg)));

    // If supported, show a menu when prompted for missing package installation
    const showMenu = crossOriginIsolated;
    await webR.evalRVoid('options(webr.show_menu = show_menu)', { env: { show_menu: !!showMenu } });
    await webR.evalRVoid('webr::global_prompt_install()', { withHandlers: false });

    // Clear the loading message
    terminalInterface.write('\x1b[2K\r');

    for (; ;) {
      const output = await webR.read();
      switch (output.type) {
        case 'stdout':
          terminalInterface.println(output.data as string);
          break;
        case 'stderr':
          terminalInterface.println(`\x1b[1;31m${output.data as string}\x1b[m`);
          break;
        case 'prompt':
          terminalInterface.read(output.data as string).then((command) => {
            webR.writeConsole(command);
          }, (reason) => {
            console.error(reason);
            throw new Error(`An error occurred reading from the R console terminal.`);
          });
          break;
        case 'canvas':
          handleCanvasMessage(output as CanvasMessage);
          break;
        case 'closed':
          throw new Error('The webR communication channel has been closed');
        default:
          console.error(`Unimplemented output type: ${output.type}`);
          console.error(output.data);
      }
    }
  })();
}

export function startPyodideApp(elem: HTMLDivElement, packages: string[] = []) {
  const pyodidePromise = loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/",
    stdout: (msg) => console.log(msg),
    stderr: (msg) => console.error(msg),
  });
  const pyConsolePromise = initPyConsole(pyodidePromise, terminalInterface);

  function App() {
    return (
      <div className='app'>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={10}>
            <PanelGroup direction="vertical">
              <Editor
                pyConsolePromise={pyConsolePromise}
                terminalInterface={terminalInterface}
              />
              <PanelResizeHandle />
              <Terminal terminalInterface={terminalInterface}
              />
            </PanelGroup>
          </Panel>
          <PanelResizeHandle />
          <Plot plotInterface={plotInterface} />
        </PanelGroup>
      </div>
    );
  }
  const root = ReactDOM.createRoot(elem);
  root.render(<StrictMode><App /></StrictMode>);

  void (async () => {
    const pyConsole = await pyConsolePromise;
    const pyodide = pyConsole.pyodide;
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await Promise.all(packages.map((pkg) => () => micropip.install(pkg)))
    await micropip.install("matplotlib");
    await micropip.destroy();

    // Prepare plotting area
    (document as any).pyodideMplTarget = document.getElementById('drop-plot');
    await pyodide.runPythonAsync(`
      import matplotlib
      matplotlib.use("module://matplotlib_pyodide.wasm_backend")
      import matplotlib.pyplot as plt
      plt.show()
    `);

    // Clear the loading message
    terminalInterface.write('\x1b[2J\x1b[2H\rq');

    // Start an async REPL
    for (; ;) {
      const command = await terminalInterface.read(">>> ");
      await pyConsole.writeConsole(command);
    };
  })();
}
