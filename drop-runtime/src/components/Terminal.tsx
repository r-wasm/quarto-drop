import React from 'react';
import { Terminal as XTerminal } from 'xterm';
import { Readline } from 'xterm-readline';
import { FitAddon } from 'xterm-addon-fit';
import { Panel } from 'react-resizable-panels';
import { TerminalInterface } from '../App';
import { WebR } from 'webr';
import 'xterm/css/xterm.css';
import './Terminal.css';

export function Terminal({
  webR,
  terminalInterface,
}: {
  webR?: WebR;
  terminalInterface: TerminalInterface;
}) {
  const divRef = React.useRef<HTMLDivElement | null>(null);
  const termRef = React.useRef<XTerminal | null>(null);
  const [readline, setReadline] = React.useState<Readline>();

  const handleShortcuts = React.useCallback((event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      event.stopPropagation();
    }

    // Interrupt R code executed by the Editor
    if (event.key === 'c' && event.ctrlKey) {
      if (webR) {
        webR.interrupt();
      }
    }
  }, []);

  // Add additional keyboard shortcut handlers
  React.useEffect(() => {
    divRef.current!.addEventListener('keydown', handleShortcuts, true);
    return () => {
      divRef.current!.removeEventListener('keydown', handleShortcuts);
    };
  }, [handleShortcuts]);

  React.useEffect(() => {
    // Don't reinitialise XTerminal after an instance has been created
    if (termRef.current || !divRef.current) {
      return;
    }

    const style = getComputedStyle(document.documentElement);
    const term = new XTerminal({
      theme: {
        background: style.getPropertyValue('--quarto-body-bg'),
        foreground: style.getPropertyValue('--quarto-body-color'),
        cursor: style.getPropertyValue('--quarto-body-color'),
        selectionBackground: style.getPropertyValue('--r-selection-background-color'),
      },
      fontSize: 22,
      fontFamily: style.getPropertyValue('--r-code-font'),
      screenReaderMode: true,
    });
    const engine = webR ? "WebR" : "Pyodide";
    term.write(`${engine} is downloading, please wait...`);

    const fitAddon = new FitAddon();
    const readline = new Readline();
    setReadline(readline);

    term.loadAddon(fitAddon);
    term.loadAddon(readline);
    term.open(divRef.current);
    term.element?.setAttribute('aria-label', 'R Terminal');
    term.element?.setAttribute('tabindex', '-1');
    fitAddon.fit();

    const resizeObserver = new ResizeObserver(() => {
      if (webR) {
        void webR.init().then(() => {
          const dims = fitAddon.proposeDimensions();
          return webR.evalRVoid(`options(width=${dims ? dims.cols : 80})`);
        });
      }
      fitAddon.fit();
    });
    resizeObserver.observe(divRef.current);

    termRef.current = term;
  }, []);

  /*
   * Setup an interface so that other components can read from and write to this
   * component's xterm instance.
   */
  React.useEffect(() => {
    if (!readline) {
      return;
    }

    terminalInterface.println = (msg: string) => {
      readline.println(msg);
    };

    terminalInterface.write = (msg: string) => {
      readline.write(msg);
    };

    terminalInterface.read = async (prompt: string) => {
      return readline.read(prompt);
    };
  }, [readline, terminalInterface]);

  return (
    <Panel id="terminal" role="region" aria-label="Terminal Pane" order={2} minSize={20}>
      <div className="terminal-container" ref={divRef}></div>
    </Panel>
  );
}

export default Terminal;
