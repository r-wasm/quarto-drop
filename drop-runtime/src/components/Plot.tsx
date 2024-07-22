import React from 'react';
import './Plot.css';
import { PlotInterface } from '../App';
import { Panel, ImperativePanelHandle } from 'react-resizable-panels';
import { WebR } from 'webr';

export function Plot({
  webR,
  plotInterface,
}: {
  webR?: WebR;
  plotInterface: PlotInterface;
}) {
  const plotContainerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const canvasElements = React.useRef<HTMLCanvasElement[]>([]);
  const plotSize = React.useRef<{width: number, height: number}>({width: 1008, height: 1008});
  const [selectedCanvas, setSelectedCanvas] = React.useState<number | null>(null);

  // Register the current canvas with the plotting interface so that when the
  // webR canvas device draws it writes to the currently active canvas element
  React.useEffect(() => {
    plotInterface.drawImage = (img: ImageBitmap) => {
      if (!canvasRef.current) {
        return;
      }
      canvasRef.current.getContext('2d')!.drawImage(img, 0, 0);
    };

    // If a new plot is created, add it to the list of canvas elements
    plotInterface.newPlot = () => {
      const plotNumber = canvasElements.current.length + 1;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('width', String(plotSize.current.width));
      canvas.setAttribute('height', String(plotSize.current.height));
      canvas.setAttribute('aria-label', `R Plot ${plotNumber}`);
      canvasRef.current = canvas;
      canvasElements.current.push(canvas);
      setSelectedCanvas(plotNumber - 1);
    };
  }, [plotInterface]);

  // Update the plot container to display the currently selected canvas element
  React.useEffect(() => {
    if (!plotContainerRef.current) {
      return;
    }
    if (selectedCanvas === null) {
      plotContainerRef.current.replaceChildren();
    } else {
      const canvas = canvasElements.current[selectedCanvas];
      plotContainerRef.current.replaceChildren(canvas);
      plotContainerRef.current.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    }
  }, [selectedCanvas]);

  // Resize the canvas() device when the plotting pane changes size
  const onPanelResize = (size: number) => {
    if (webR) {
      plotSize.current.width = size * window.innerWidth / 100;
      plotSize.current.height = window.innerHeight;
  
      void webR.init().then(async () => {
        await webR.evalRVoid(`
          # Close any active canvas devices
          repeat {
            devices <- dev.list()
            idx <- which(names(devices) == "canvas")
            if (length(idx) == 0) {
              break
            }
            dev.off(devices[idx[1]])
          }
          # Set canvas size for future devices
          options(webr.fig.width = ${plotSize.current.width / 2}, webr.fig.height = ${plotSize.current.height / 2})
      `, { env: {} });
      });
    }
  };

  const rightPanelRef = React.useRef<ImperativePanelHandle | null>(null);
  React.useEffect(() => {
    window.addEventListener("resize", () => {
      if (!rightPanelRef.current) return;
      onPanelResize(rightPanelRef.current.getSize());
    });
  }, []);

  return (
    <Panel ref={rightPanelRef} onResize={onPanelResize} minSize={10}>
      <div className='plot-background'>
          <div id="drop-plot" ref={plotContainerRef} className="plot-container"></div>
      </div>
    </Panel>
  );
}

export default Plot;
