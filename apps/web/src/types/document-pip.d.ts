/**
 * Type declarations for the Document Picture-in-Picture API
 * https://developer.chrome.com/docs/web-platform/document-picture-in-picture/
 */

interface DocumentPictureInPictureOptions {
  /** Width of the PiP window in pixels */
  width?: number;
  /** Height of the PiP window in pixels */
  height?: number;
  /** Whether to disallow returning to the main tab (defaults to false) */
  disallowReturnToOpener?: boolean;
}

interface DocumentPictureInPicture {
  /** The current Picture-in-Picture window, or null if none is open */
  readonly window: Window | null;

  /**
   * Opens a Picture-in-Picture window for the document.
   * Requires a user gesture (click, keypress, etc.).
   */
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;

  /** Fired when a Picture-in-Picture window is opened */
  onenter: ((this: DocumentPictureInPicture, ev: Event) => void) | null;
}

declare global {
  interface Window {
    /** Document Picture-in-Picture API (Chromium only) */
    documentPictureInPicture: DocumentPictureInPicture;
  }
}

export {};
