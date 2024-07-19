import "./drop-runtime.css";

declare global {
  interface Window {
    RevealDrop?: any;
  }
}

window.RevealDrop = window.RevealDrop || {
  id: 'RevealDrop',
  init: function () {
    const container = document.createElement('div');
    container.className = "drop-clip"
    const drop = document.createElement('div');
    drop.className = "drop";
    drop.innerHTML = 'Yo';
    container.appendChild(drop);
    document.querySelector(".reveal").appendChild(container);

    document.addEventListener("keydown",(event)=>{
      if (event.key == "`") {
        drop.classList.toggle("active");
      }
    })
  },
};
