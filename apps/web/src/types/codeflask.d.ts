declare module "codeflask" {
  interface CodeFlaskOptions {
    language?: string;
    lineNumbers?: boolean;
    readonly?: boolean;
    defaultTheme?: boolean;
    tabSize?: number;
    areaId?: string;
    ariaLabelledby?: string;
    handleTabs?: boolean;
    handleSelfClosingCharacters?: boolean;
    handleNewLineIndentation?: boolean;
  }

  export default class CodeFlask {
    constructor(selectorOrElement: string | HTMLElement, options?: CodeFlaskOptions);
    updateCode(code: string): void;
    onUpdate(callback: (code: string) => void): void;
    getCode(): string;
    addLanguage(name: string, options: object): void;
  }
}
