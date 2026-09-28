import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  sanitizeHTML,
  compileASTToHTML,
  generatePrintableHTML,
  astToMarkdown,
  markdownToAST
} from '../server/services/transformationPipeline.js';

describe('Transformation Pipeline & DOMPurify Security Tests', () => {
  it('should block and neutralize dangerous XSS injection vectors', () => {
    const maliciousVectors = [
      '<script>alert("pwned")</script>',
      '<img src="invalid.jpg" onerror="alert(\'xss\')" />',
      '<a href="javascript:alert(\'hack\')">Click me</a>',
      '<iframe src="https://attacker.com"></iframe>',
      '<div onmouseover="fetch(\'/steal\')">Hover</div>'
    ];

    for (const vector of maliciousVectors) {
      const sanitized = sanitizeHTML(vector);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).not.toContain('onmouseover');
    }
  });

  it('should preserve safe formatting tags during sanitization', () => {
    const safeContent = '<strong>Bold text</strong> and <em>italicized</em> and <code>code</code>';
    const sanitized = sanitizeHTML(safeContent);
    expect(sanitized).toContain('<strong>Bold text</strong>');
    expect(sanitized).toContain('<em>italicized</em>');
    expect(sanitized).toContain('<code>code</code>');
  });

  it('should compile an AST tree into semantic sanitized HTML', () => {
    const rootId = uuidv4();
    const tree = {
      id: rootId,
      type: 'root',
      children: [
        {
          id: uuidv4(),
          type: 'heading',
          content: 'Title Heading',
          properties: { level: 1 }
        },
        {
          id: uuidv4(),
          type: 'paragraph',
          content: 'This is a <strong>safe</strong> paragraph.'
        },
        {
          id: uuidv4(),
          type: 'code_block',
          content: 'const x = 10;\nconsole.log(x);',
          properties: { language: 'javascript' }
        },
        {
          id: uuidv4(),
          type: 'callout',
          content: 'Important notice regarding CRDT sync.',
          properties: { calloutType: 'warning' }
        }
      ]
    };

    const html = compileASTToHTML(tree);
    expect(html).toContain('<h1 class="syncdoc-heading syncdoc-h1"');
    expect(html).toContain('Title Heading');
    expect(html).toContain('<p class="syncdoc-paragraph"');
    expect(html).toContain('<pre class="syncdoc-code-block language-javascript">');
    expect(html).toContain('const x = 10;');
    expect(html).toContain('syncdoc-callout-warning');
  });

  it('should bidirectional convert Markdown to AST and back to Markdown', () => {
    const markdown = `# Architecture Overview

SyncDoc uses CRDT matrix replication.

\`\`\`javascript
const ydoc = new Y.Doc();
\`\`\`

- AST Database
- Synchronization Engine
- Custom React UI`;

    const ast = markdownToAST(markdown);
    expect(ast.children.length).toBe(4);
    expect(ast.children[0].type).toBe('heading');
    expect(ast.children[0].properties.level).toBe(1);
    expect(ast.children[1].type).toBe('paragraph');
    expect(ast.children[2].type).toBe('code_block');
    expect(ast.children[2].properties.language).toBe('javascript');
    expect(ast.children[3].type).toBe('list');
    expect(ast.children[3].children.length).toBe(3);

    const convertedMarkdown = astToMarkdown(ast);
    expect(convertedMarkdown).toContain('# Architecture Overview');
    expect(convertedMarkdown).toContain('SyncDoc uses CRDT matrix replication.');
    expect(convertedMarkdown).toContain('```javascript');
    expect(convertedMarkdown).toContain('- AST Database');
  });

  it('should generate a complete printable HTML document with embedded CSS', () => {
    const rootId = uuidv4();
    const printable = generatePrintableHTML('Technical Spec', {
      id: rootId,
      type: 'root',
      children: [
        { id: uuidv4(), type: 'heading', content: 'Doc Header', properties: { level: 1 } },
        { id: uuidv4(), type: 'paragraph', content: 'Doc body' }
      ]
    });

    expect(printable).toContain('<!DOCTYPE html>');
    expect(printable).toContain('<title>Technical Spec</title>');
    expect(printable).toContain('@media print');
    expect(printable).toContain('Doc Header');
    expect(printable).toContain('Doc body');
  });
});
