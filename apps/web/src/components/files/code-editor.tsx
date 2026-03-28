"use client";

import { useRef, useEffect, useCallback } from "react";

interface Props {
  code: string;
  language: string;
  readOnly?: boolean;
  onChange?: (code: string) => void;
}

export function CodeEditor({ code, language, readOnly = true, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flaskRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const codeRef = useRef(code);
  const lastProgrammaticCode = useRef<string | null>(null);
  onChangeRef.current = onChange;
  codeRef.current = code;

  const initEditor = useCallback(async () => {
    if (!containerRef.current) return;

    // Clean up existing instance
    if (flaskRef.current) {
      containerRef.current.innerHTML = "";
      flaskRef.current = null;
    }

    const CodeFlaskModule = await import("codeflask");
    const CodeFlask = CodeFlaskModule.default;

    if (!containerRef.current) return;

    const flask = new CodeFlask(containerRef.current, {
      language,
      lineNumbers: true,
      readonly: readOnly,
      defaultTheme: false,
    });

    flask.updateCode(codeRef.current);

    flask.onUpdate((newCode: string) => {
      // Skip callbacks triggered by programmatic updateCode calls
      if (lastProgrammaticCode.current !== null && newCode === lastProgrammaticCode.current) {
        lastProgrammaticCode.current = null;
        return;
      }
      if (onChangeRef.current) {
        onChangeRef.current(newCode);
      }
    });

    flaskRef.current = flask;
  }, [language, readOnly]);

  // Initialize editor on language/readOnly change
  useEffect(() => {
    const el = containerRef.current;
    initEditor();

    return () => {
      if (el) el.innerHTML = "";
      flaskRef.current = null;
    };
  }, [initEditor]);

  // Update code without reinitializing
  useEffect(() => {
    const flask = flaskRef.current;
    if (flask) {
      const currentCode = flask.getCode();
      if (currentCode !== code) {
        // Use a value comparison instead of a timing-dependent flag
        lastProgrammaticCode.current = code;
        flask.updateCode(code);
      }
    }
  }, [code]);

  return <div ref={containerRef} className="code-editor-container h-full w-full overflow-auto" />;
}
