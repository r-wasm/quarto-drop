import "./drop-runtime.css";
import keycode from 'keycode';
import { startWebRApp, startPyodideApp } from './App';

declare global {
  interface Window {
    Reveal: any;
    RevealDrop?: {
      id: string;
      dropElement: HTMLDivElement;
      focusElement: Element | null;
      init: (reveal: any) => void;
      toggleDrop: () => void;
      isActive: () => boolean;
    };
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
  focusElement: null,
  dropElement: document.createElement('div'),
  init: function (reveal) {
    const revealConfig = reveal.getConfig();
    const config = revealConfig.drop as DropConfig;

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
      link.onclick = (event) => {
        window.RevealDrop.toggleDrop();
        event.preventDefault();
        event.stopPropagation();
      }
      link.innerHTML = require('./svg/terminal.svg');
      button.appendChild(link);
      document.querySelector(".reveal").appendChild(button);
    }

    // Keyboard listeners
    reveal.addKeyBinding({
      keyCode: keycode(config.shortcut),
      key: config.shortcut,
      description: 'Toggle console'
    }, () => {});

    document.addEventListener("keydown", (event) => {
      if (event.key == config.shortcut && !event.altKey) {
        window.RevealDrop.toggleDrop();
        reveal.toggleHelp(false);
        reveal.toggleOverview(false);

        if (window.RevealDrop.isActive()) {
          reveal.configure({ keyboard: false });
          // Restore focus as console is shown
          if (window.RevealDrop.focusElement instanceof HTMLElement) {
            window.RevealDrop.focusElement.focus();
          }
        } else {
          reveal.configure({ keyboard: true });
          // Remove focus as console is hidden
          window.RevealDrop.focusElement = document.activeElement;
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }

        event.preventDefault();
        event.stopPropagation();
      }
    }, { capture: true });
  },
  toggleDrop() {
    window.RevealDrop.dropElement.classList.toggle("active");
  },
  isActive() {
    return window.RevealDrop.dropElement.classList.contains("active");
  }
};
