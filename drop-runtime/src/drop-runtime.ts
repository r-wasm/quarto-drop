import "./drop-runtime.css";
import { startWebRApp } from './App';

declare global {
  interface Window {
    Reveal: any;
    RevealDrop?: any;
  }
}

window.RevealDrop = window.RevealDrop || {
  id: 'RevealDrop',
  dropElement: document.createElement('div'),
  init: function () {
    // Add Drop down panel to DOM
    const drop = window.RevealDrop.dropElement;
    const container = document.createElement('div');
    container.className = "drop-clip"
    drop.className = "drop";
    container.appendChild(drop);
    document.querySelector(".reveal").appendChild(container);

    // Initialise React REPL app
    startWebRApp(drop);

    // Add button controls
    // IF toggleDropButton
    const button = document.createElement('div');
    const link = document.createElement('a');
    button.className = "drop-button";
    button.id = "toggle-drop";
    link.href = "#";
    link.title = `Toggle console (${"`"})`;
    link.onclick = () => window.RevealDrop.toggleDrop();
    link.innerHTML = require('./svg/terminal.svg');
    button.appendChild(link);
    document.querySelector(".reveal").appendChild(button);

    // Keyboard listeners
    document.addEventListener("keydown", (event) => {
      if (event.key == "`" && !event.altKey) {
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
