import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize rendered HTML to prevent XSS while preserving
 * MathML, Prism code highlighting, and mermaid placeholders.
 */
export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      // Standard block elements
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'div', 'span', 'br', 'hr',
      'blockquote', 'pre', 'code',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'a', 'strong', 'em', 'del', 's', 'sub', 'sup',
      'img',
      // MathML elements (temml output)
      'math', 'mi', 'mo', 'mn', 'ms', 'mtext', 'mspace',
      'mrow', 'mfrac', 'msqrt', 'mroot', 'msub', 'msup', 'msubsup',
      'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd',
      'mpadded', 'mphantom', 'menclose', 'mmultiscripts',
      'semantics', 'annotation',
      // SVG for mermaid output (no foreignObject for security)
      'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line',
      'polyline', 'polygon', 'text', 'tspan', 'defs', 'marker',
      'use', 'clipPath', 'mask', 'pattern',
    ],
    allowedAttributes: {
      '*': ['class', 'id'],
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan'],
      'div': ['data-source'],
      'pre': ['class'],
      'code': ['class'],
      'span': ['class', 'data-mention-type', 'data-mention-name'],
      // MathML attributes
      'math': ['xmlns', 'display', 'mathvariant'],
      'mi': ['mathvariant'],
      'mo': ['stretchy', 'fence', 'separator', 'lspace', 'rspace', 'minsize', 'maxsize', 'movablelimits', 'accent'],
      'mn': ['mathvariant'],
      'mspace': ['width', 'height', 'depth'],
      'mfrac': ['linethickness'],
      'mtable': ['columnalign', 'rowalign', 'columnspacing', 'rowspacing'],
      'mtd': ['columnalign'],
      'mpadded': ['width', 'height', 'depth', 'lspace', 'voffset'],
      'menclose': ['notation'],
      'annotation': ['encoding'],
      // SVG attributes
      'svg': ['viewBox', 'width', 'height', 'xmlns', 'fill', 'stroke'],
      'g': ['transform', 'fill', 'stroke'],
      'path': ['d', 'fill', 'stroke', 'stroke-width', 'transform'],
      'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke'],
      'circle': ['cx', 'cy', 'r', 'fill', 'stroke'],
      'ellipse': ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke'],
      'line': ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
      'polyline': ['points', 'fill', 'stroke'],
      'polygon': ['points', 'fill', 'stroke'],
      'text': ['x', 'y', 'dx', 'dy', 'text-anchor', 'font-size', 'fill'],
      'tspan': ['x', 'y', 'dx', 'dy'],
      'marker': ['id', 'viewBox', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient'],
      'use': ['href', 'x', 'y', 'width', 'height'],
      'clipPath': ['id'],
      'mask': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
