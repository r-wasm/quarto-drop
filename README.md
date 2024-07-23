# Quarto Drop plugin for reveal.js

Have you ever given a talk or presentation and wanted an R or Python console *right there* in your slides for some quick throwaway examples or demos? Do you find switching to another window or desktop so that you can show some work in an IDE fiddly and distracting?

If so, this plugin is for you! With Quarto Drop, you can press a shortcut key to immediately drop down from the top of the slide an interactive R or Python console, editor and plotting window. The same shortcut key then dismisses the console.

Show your demo then dismiss the console. Later, on another slide, you can drop it down again and state is maintained over multiple slides.


Code execution is powered by WebAssembly, using [webR](https://docs.r-wasm.org) and [Pyodide](https://pyodide.org). No R or Python execution servers are required.

## Usage

1. Install the Quarto Drop extension:

```bash
quarto add r-wasm/quarto-drop
```

2. Add the plugin to your reveal.js slides, as part of your `yaml` header:

```yaml
---
format: revealjs
revealjs-plugins:
  - drop
---
```

3. During the presentation, press the drop shortcut. By default, it is the backtick key: "`". Alternatively, press the console button at the bottom left of the slide.

## Demo

![](https://github.com/r-wasm/quarto-drop/raw/main/images/drop.gif)

Example slides:
  * R: https://r-wasm.github.io/quarto-drop/example.html
  * Python: https://r-wasm.github.io/quarto-drop/example-python.html

## Configuration

#### Change the shortcut key and console button visibility:

```yaml
format:
  revealjs:
    drop:
      shortcut: "]"
      button: false
```

#### Execute Python code

```yaml
format:
  revealjs:
    drop:
      engine: pyodide
```

#### Load packages automatically on page load

```yaml
format:
  revealjs:
    drop:
      engine: webr
      webr:
        packages:
          - ggplot2
          - dplyr
```

