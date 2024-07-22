import React from 'react';
import { WebR, RFunction, Shelter } from 'webr';
import { FaPlay } from 'react-icons/fa';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { syntaxHighlighting } from "@codemirror/language";
import { tagHighlighter, tags } from "@lezer/highlight"
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { Panel } from 'react-resizable-panels';
import { TerminalInterface } from '../App';
import { r } from 'codemirror-lang-r';
import type { WebRDataJsAtomic } from 'webr/dist/webR/robj';
import 'react-data-grid/lib/styles.css';
import './Editor.css';
import * as utils from './utils';

const tagHighlighterTok = tagHighlighter([
  { tag: tags.keyword, class: "tok-keyword" },
  { tag: tags.operator, class: "tok-operator" },
  { tag: tags.definitionOperator, class: "tok-definitionOperator" },
  { tag: tags.compareOperator, class: "tok-compareOperator" },
  { tag: tags.attributeName, class: "tok-attributeName" },
  { tag: tags.controlKeyword, class: "tok-controlKeyword" },
  { tag: tags.comment, class: "tok-comment" },
  { tag: tags.string, class: "tok-string" },
  { tag: tags.regexp, class: "tok-string2" },
  { tag: tags.variableName, class: "tok-variableName" },
  { tag: tags.bool, class: "tok-bool" },
  { tag: tags.separator, class: "tok-separator" },
  { tag: tags.literal, class: "tok-literal" },
  { tag: [tags.number, tags.integer], class: "tok-number" },
  { tag: tags.function(tags.variableName), class: "tok-function-variableName" },
  { tag: tags.function(tags.attributeName), class: "tok-function-attributeName" },
]);

const language = new Compartment();
const tabSize = new Compartment();

export function Editor({
  webR,
  terminalInterface,
}: {
  webR: WebR
  terminalInterface: TerminalInterface;
}) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [editorView, setEditorView] = React.useState<EditorView>();
  const runSelectedCode = React.useRef((): void => {
    throw new Error('Unable to run code, webR not initialised.');
  });

  const completionMethods = React.useRef<null | {
    assignLineBuffer: RFunction;
    assignToken: RFunction;
    assignStart: RFunction;
    assignEnd: RFunction;
    completeToken: RFunction;
    retrieveCompletions: RFunction;
  }>(null);

  React.useEffect(() => {
    let shelter: Shelter | null = null;

    void webR.init().then(async () => {
      shelter = await new webR.Shelter();
      await webR.evalRVoid('rc.settings(func=TRUE, fuzzy=TRUE)');
      completionMethods.current = {
        assignLineBuffer: await shelter.evalR('utils:::.assignLinebuffer') as RFunction,
        assignToken: await shelter.evalR('utils:::.assignToken') as RFunction,
        assignStart: await shelter.evalR('utils:::.assignStart') as RFunction,
        assignEnd: await shelter.evalR('utils:::.assignEnd') as RFunction,
        completeToken: await shelter.evalR('utils:::.completeToken') as RFunction,
        retrieveCompletions: await shelter.evalR('utils:::.retrieveCompletions') as RFunction,
      };
    });

    return function cleanup() {
      if (shelter) void shelter.purge();
    };
  }, []);

  const completion = React.useCallback(async (context: CompletionContext) => {
    if (!completionMethods.current) {
      return null;
    }
    const line = context.state.doc.lineAt(context.state.selection.main.head).text;
    const { from, to, text } = context.matchBefore(/[a-zA-Z0-9_.:]*/) ?? { from: 0, to: 0, text: '' };
    if (from === to && !context.explicit) {
      return null;
    }
    await completionMethods.current.assignLineBuffer(line.replace(/\)+$/, ""));
    await completionMethods.current.assignToken(text);
    await completionMethods.current.assignStart(from + 1);
    await completionMethods.current.assignEnd(to + 1);
    await completionMethods.current.completeToken();
    const compl = await completionMethods.current.retrieveCompletions() as WebRDataJsAtomic<string>;
    const options = compl.values.map((val) => {
      if (!val) {
        throw new Error('Missing values in completion result.');
      }
      return { label: val, boost: val.endsWith("=") ? 10 : 0 };
    });

    return { from: from, options };
  }, []);

  const editorExtensions = [
    basicSetup,
    syntaxHighlighting(tagHighlighterTok),
    language.of(r()),
    tabSize.of(EditorState.tabSize.of(2)),
    Prec.high(
      keymap.of([
        indentWithTab,
        {
          key: 'Mod-Enter',
          run: () => {
            if (!runSelectedCode.current) return false;
            runSelectedCode.current();
            return true;
          },
        },
      ]
      )),
    autocompletion({ override: [completion] })
  ];

  React.useEffect(() => {
    runSelectedCode.current = (): void => {
      if (!editorView) {
        return;
      }
      let code = utils.getSelectedText(editorView);
      if (code === '') {
        code = utils.getCurrentLineText(editorView);
        utils.moveCursorToNextLine(editorView);
      }
      code.split('\n').forEach((line) => webR.writeConsole(line));
    };
  }, [editorView]);

  const runFile = React.useCallback(() => {
    if (!editorView) {
      return;
    }
    const code = editorView.state.doc.toString();
    terminalInterface.write('\x1b[2K\r');
    code.split('\n').forEach((line) => webR.writeConsole(line));
  }, [editorView]);

  React.useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const state = EditorState.create({ extensions: editorExtensions });
    const view = new EditorView({ state, parent: editorRef.current });
    setEditorView(view);

    return function cleanup() {
      view.destroy();
    };
  }, []);

  return (
    <Panel
      id="editor"
      role="region"
      aria-label="Editor Pane"
      order={1}
      minSize={20}
      defaultSize={60}
    >
      <div className="editor-header">
        <div role="toolbar" aria-label="Editor Toolbar" className="editor-actions">
          <button aria-label="Run" onClick={runFile}>
            <FaPlay aria-hidden="true" /> Run
          </button>
        </div>
      </div>
      <div
        aria-label="Editor"
        aria-describedby="editor-desc"
        className="editor-container"
        ref={editorRef}
      >
      </div>
      <p className="d-none" id="editor-desc">
        This component is an instance of the <a href="https://codemirror.net/">CodeMirror</a> interactive text editor.
        The editor has been configured so that the Tab key controls the indentation of code.
        To move focus away from the editor, press the Escape key, and then press the Tab key directly after it.
        Escape and then Shift-Tab can also be used to move focus backwards.
      </p>
    </Panel>
  );
}

export default Editor;
