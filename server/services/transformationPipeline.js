import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { v4 as uuidv4 } from 'uuid';
import { marked } from 'marked';

// Initialize DOMPurify with JSDOM window for Node.js backend
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Strict configuration for sanitization
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'pre', 'code', 'blockquote',
    'div', 'span', 'ul', 'ol', 'li', 'hr',
    'strong', 'em', 'b', 'i', 'u', 's', 'del',
    'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'br', 'svg', 'path'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'href', 'title', 'target', 'rel',
    'data-node-id', 'data-type', 'data-language',
    'aria-label', 'role', 'style'
  ],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'javascript:']
};

/**
 * Sanitize untrusted user string or HTML fragment.
 * Guaranteed to strip XSS payloads like <script>, onerror=..., javascript:...
 */
export function sanitizeHTML(input) {
  if (typeof input !== 'string') return '';
  return purify.sanitize(input, PURIFY_CONFIG);
}

/**
 * Escape HTML special characters for raw code blocks.
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Compile AST Tree into semantic, sanitized HTML.
 */
export function compileASTToHTML(node) {
  if (!node) return '';

  const idAttr = `id="node-${node.id}" data-node-id="${node.id}" data-type="${node.type}"`;

  let innerChildrenHTML = '';
  if (Array.isArray(node.children) && node.children.length > 0) {
    innerChildrenHTML = node.children.map(child => compileASTToHTML(child)).join('\n');
  }

  // Pre-sanitize textual content
  const safeContent = sanitizeHTML(node.content || '');

  switch (node.type) {
    case 'root':
      return `<article class="syncdoc-document" ${idAttr}>\n${innerChildrenHTML}\n</article>`;

    case 'section':
      return `<section class="syncdoc-section" ${idAttr}>\n${innerChildrenHTML}\n</section>`;

    case 'heading': {
      const level = Math.min(Math.max(Number(node.properties?.level) || 1, 1), 6);
      return `<h${level} class="syncdoc-heading syncdoc-h${level}" ${idAttr}>${safeContent}</h${level}>`;
    }

    case 'paragraph':
      return `<p class="syncdoc-paragraph" ${idAttr}>${safeContent || '<br/>'}</p>`;

    case 'code_block': {
      const lang = escapeHTML(node.properties?.language || 'text');
      const escapedCode = escapeHTML(node.content || '');
      return `
<div class="syncdoc-code-wrapper" ${idAttr}>
  <div class="syncdoc-code-header">
    <span class="syncdoc-code-lang">${lang}</span>
  </div>
  <pre class="syncdoc-code-block language-${lang}"><code>${escapedCode}</code></pre>
</div>`.trim();
    }

    case 'blockquote':
      return `<blockquote class="syncdoc-blockquote" ${idAttr}>${safeContent}</blockquote>`;

    case 'callout': {
      const calloutType = ['info', 'warning', 'tip', 'danger'].includes(node.properties?.calloutType)
        ? node.properties.calloutType
        : 'info';
      return `
<div class="syncdoc-callout syncdoc-callout-${calloutType}" ${idAttr}>
  <div class="syncdoc-callout-header">
    <strong class="syncdoc-callout-tag">${calloutType.toUpperCase()}</strong>
  </div>
  <div class="syncdoc-callout-body">${safeContent}</div>
</div>`.trim();
    }

    case 'list': {
      const isOrdered = Boolean(node.properties?.ordered);
      const tag = isOrdered ? 'ol' : 'ul';
      return `<${tag} class="syncdoc-list ${isOrdered ? 'syncdoc-list-ordered' : 'syncdoc-list-bullet'}" ${idAttr}>\n${innerChildrenHTML}\n</${tag}>`;
    }

    case 'list_item': {
      const isChecked = Boolean(node.properties?.checked);
      return `<li class="syncdoc-list-item ${isChecked ? 'syncdoc-item-checked' : ''}" ${idAttr}>${safeContent}</li>`;
    }

    case 'divider':
      return `<hr class="syncdoc-divider" ${idAttr} />`;

    case 'table':
      return `<div class="syncdoc-table-container" ${idAttr}><table class="syncdoc-table"><tbody>${innerChildrenHTML}</tbody></table></div>`;

    default:
      return `<div class="syncdoc-unknown-block" ${idAttr}>${safeContent}</div>`;
  }
}

/**
 * Generate a complete, styled HTML document ready for display, printing, or PDF generation.
 */
export function generatePrintableHTML(docTitle, rootNode) {
  const bodyHTML = compileASTToHTML(rootNode);
  const safeTitle = escapeHTML(docTitle || 'SyncDoc Document');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      --color-text: #1e293b;
      --color-bg: #ffffff;
      --color-muted: #64748b;
      --color-border: #e2e8f0;
      --color-code-bg: #0f172a;
      --color-code-text: #f8fafc;
    }
    @media print {
      body { margin: 0; padding: 20mm; font-size: 11pt; color: #000; }
      .syncdoc-code-wrapper, .syncdoc-callout, .syncdoc-blockquote { page-break-inside: avoid; }
      @page { margin: 20mm; }
    }
    body {
      font-family: var(--font-sans);
      color: var(--color-text);
      background-color: var(--color-bg);
      line-height: 1.65;
      margin: 0 auto;
      padding: 3rem 2rem;
      max-width: 860px;
    }
    h1.syncdoc-h1 { font-size: 2.25rem; font-weight: 800; border-bottom: 2px solid var(--color-border); padding-bottom: 0.5rem; margin-top: 1.5rem; margin-bottom: 1.25rem; color: #0f172a; }
    h2.syncdoc-h2 { font-size: 1.6rem; font-weight: 700; border-bottom: 1px solid var(--color-border); padding-bottom: 0.35rem; margin-top: 2rem; margin-bottom: 1rem; color: #1e293b; }
    h3.syncdoc-h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #334155; }
    p.syncdoc-paragraph { margin-bottom: 1rem; font-size: 1.05rem; }
    .syncdoc-code-wrapper { background: var(--color-code-bg); border-radius: 8px; margin: 1.25rem 0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .syncdoc-code-header { background: #1e293b; color: #94a3b8; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; padding: 0.4rem 1rem; letter-spacing: 0.05em; font-family: var(--font-mono); }
    pre.syncdoc-code-block { margin: 0; padding: 1rem; overflow-x: auto; color: var(--color-code-text); font-family: var(--font-mono); font-size: 0.95rem; line-height: 1.5; }
    blockquote.syncdoc-blockquote { border-left: 4px solid #3b82f6; background: #f8fafc; padding: 0.75rem 1.25rem; margin: 1.25rem 0; font-style: italic; color: #475569; border-radius: 0 6px 6px 0; }
    .syncdoc-callout { border-radius: 8px; padding: 1rem 1.25rem; margin: 1.25rem 0; border: 1px solid transparent; }
    .syncdoc-callout-info { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
    .syncdoc-callout-warning { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .syncdoc-callout-tip { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .syncdoc-callout-danger { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .syncdoc-callout-tag { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; display: inline-block; margin-bottom: 0.25rem; }
    ul.syncdoc-list, ol.syncdoc-list { margin: 1rem 0; padding-left: 1.75rem; }
    li.syncdoc-list-item { margin-bottom: 0.4rem; }
    hr.syncdoc-divider { border: 0; height: 1px; background: var(--color-border); margin: 2rem 0; }
  </style>
</head>
<body>
  ${bodyHTML}
</body>
</html>`;
}

/**
 * Convert AST to clean Markdown representation.
 */
export function astToMarkdown(node) {
  if (!node) return '';

  function render(n) {
    let out = '';
    const content = n.content || '';

    switch (n.type) {
      case 'root':
      case 'section':
        if (Array.isArray(n.children)) {
          out = n.children.map(render).filter(Boolean).join('\n\n');
        }
        break;

      case 'heading': {
        const lvl = Number(n.properties?.level) || 1;
        out = `${'#'.repeat(lvl)} ${content}`;
        break;
      }

      case 'paragraph':
        out = content;
        break;

      case 'code_block': {
        const lang = n.properties?.language || '';
        out = `\`\`\`${lang}\n${content}\n\`\`\``;
        break;
      }

      case 'blockquote':
        out = content.split('\n').map(line => `> ${line}`).join('\n');
        break;

      case 'callout': {
        const type = (n.properties?.calloutType || 'info').toUpperCase();
        out = `> [!${type}]\n> ${content.replace(/\n/g, '\n> ')}`;
        break;
      }

      case 'list': {
        if (Array.isArray(n.children)) {
          const isOrdered = Boolean(n.properties?.ordered);
          out = n.children
            .map((item, idx) => {
              const prefix = isOrdered ? `${idx + 1}. ` : `- `;
              return `${prefix}${item.content || ''}`;
            })
            .join('\n');
        }
        break;
      }

      case 'list_item':
        out = `- ${content}`;
        break;

      case 'divider':
        out = '---';
        break;

      default:
        out = content;
    }
    return out;
  }

  return render(node);
}

/**
 * Parse Markdown string into structured AST JSON representation.
 */
export function markdownToAST(markdownString) {
  const rootId = uuidv4();
  const rootNode = {
    id: rootId,
    type: 'root',
    content: '',
    properties: {},
    parentId: null,
    order: 0,
    depth: 0,
    children: []
  };

  if (!markdownString || typeof markdownString !== 'string') {
    return rootNode;
  }

  const tokens = marked.lexer(markdownString);

  tokens.forEach((token, index) => {
    const childId = uuidv4();
    let astNode = null;

    switch (token.type) {
      case 'heading':
        astNode = {
          id: childId,
          type: 'heading',
          content: token.text,
          properties: { level: token.depth },
          parentId: rootId,
          order: index,
          depth: 1,
          children: []
        };
        break;

      case 'paragraph':
        astNode = {
          id: childId,
          type: 'paragraph',
          content: token.text,
          properties: {},
          parentId: rootId,
          order: index,
          depth: 1,
          children: []
        };
        break;

      case 'code':
        astNode = {
          id: childId,
          type: 'code_block',
          content: token.text,
          properties: { language: token.lang || 'javascript' },
          parentId: rootId,
          order: index,
          depth: 1,
          children: []
        };
        break;

      case 'blockquote':
        astNode = {
          id: childId,
          type: 'blockquote',
          content: token.text,
          properties: {},
          parentId: rootId,
          order: index,
          depth: 1,
          children: []
        };
        break;

      case 'list': {
        const listChildren = (token.items || []).map((item, itemIdx) => ({
          id: uuidv4(),
          type: 'list_item',
          content: item.text,
          properties: { checked: item.checked ?? false },
          parentId: childId,
          order: itemIdx,
          depth: 2,
          children: []
        }));

        astNode = {
          id: childId,
          type: 'list',
          content: '',
          properties: { ordered: token.ordered || false },
          parentId: rootId,
          order: index,
          depth: 1,
          children: listChildren
        };
        break;
      }

      case 'hr':
        astNode = {
          id: childId,
          type: 'divider',
          content: '',
          properties: {},
          parentId: rootId,
          order: index,
          depth: 1,
          children: []
        };
        break;

      default:
        if (token.text) {
          astNode = {
            id: childId,
            type: 'paragraph',
            content: token.text,
            properties: {},
            parentId: rootId,
            order: index,
            depth: 1,
            children: []
          };
        }
    }

    if (astNode) {
      rootNode.children.push(astNode);
    }
  });

  return rootNode;
}
