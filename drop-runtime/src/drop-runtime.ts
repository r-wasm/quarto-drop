import "./drop-runtime.css";
import { startWebRApp, startPyodideApp } from './App';

declare global {
  interface Window {
    Reveal: any;
    RevealDrop?: any;
  }
}

type DropConfig = {
  button: boolean;
  shortcut: string;
  engine: "webr";
  webr: {
    packages?: string[];
  };
} | {
  button: boolean;
  shortcut: string;
  engine: "pyodide";
  pyodide: {
    packages?: string[];
  }
}

window.RevealDrop = window.RevealDrop || {
  id: 'RevealDrop',
  dropElement: document.createElement('div'),
  config: {},
  init: function() {
    // Configuration
    const config = window.Reveal.getConfig().drop as DropConfig;
    window.RevealDrop.config = config;

    // Add Drop down panel to DOM
    const drop = window.RevealDrop.dropElement;
    const container = document.createElement('div');
    container.className = "drop-clip"
    drop.className = "drop";
    container.appendChild(drop);
    document.querySelector(".reveal").appendChild(container);

    // Initialise React REPL app
    if (config.engine === "webr") {
      startWebRApp(drop, config.webr.packages);
    } else if (config.engine === "pyodide") {
      startPyodideApp(drop, config.pyodide.packages);
    }

    // Add button controls
    if (config.button) {
      const button = document.createElement('div');
      const link = document.createElement('a');
      button.className = "drop-button";
      button.id = "toggle-drop";
      link.href = "#";
      link.title = `Toggle console (${config.shortcut})`;
      link.onclick = () => window.RevealDrop.toggleDrop();
      link.innerHTML = require('./svg/terminal.svg');
      button.appendChild(link);
      document.querySelector(".reveal").appendChild(button);
    }

    // Keyboard listeners
    document.addEventListener("keydown", (event) => {
      if (event.key == config.shortcut && !event.altKey) {
        window.RevealDrop.toggleDrop();
        event.preventDefault();
        event.stopPropagation();
      }
    }, { capture: true });
  },
  toggleDrop() {
    window.RevealDrop.dropElement.classList.toggle("active");
  }
};
