import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Document, traceAndValidateAST } from '../models/Document.js';
import {
  compileASTToHTML,
  generatePrintableHTML,
  astToMarkdown,
  markdownToAST,
  sanitizeHTML
} from '../services/transformationPipeline.js';

const router = express.Router();

/**
 * Technical Spec seed template matching the project prompt use case.
 */
function createTechnicalSpecAST() {
  const rootId = uuidv4();
  const h1Id = uuidv4();
  const calloutId = uuidv4();
  const p1Id = uuidv4();
  const h2Id = uuidv4();
  const p2Id = uuidv4();
  const codeId = uuidv4();
  const h3Id = uuidv4();
  const quoteId = uuidv4();
  const listId = uuidv4();
  const dividerId = uuidv4();

  return {
    id: rootId,
    type: 'root',
    content: '',
    properties: {},
    parentId: null,
    order: 0,
    depth: 0,
    children: [
      {
        id: h1Id,
        type: 'heading',
        content: 'Technical Spec: SyncDoc Distributed AST Engine',
        properties: { level: 1 },
        parentId: rootId,
        order: 0,
        depth: 1,
        author: 'Lead Architect',
        children: []
      },
      {
        id: calloutId,
        type: 'callout',
        content: 'Multi-user collaborative document engine with real-time CRDT AST conflict resolution & visual block indicators.',
        properties: { calloutType: 'info' },
        parentId: rootId,
        order: 1,
        depth: 1,
        author: 'Lead Architect',
        children: []
      },
      {
        id: p1Id,
        type: 'paragraph',
        content: 'Plain text merging is insufficient for complex structural documents, leading to lost work when multiple users edit simultaneously. SyncDoc uses an Abstract Syntax Tree (AST) paired with Yjs CRDTs to preserve document integrity.',
        properties: {},
        parentId: rootId,
        order: 2,
        depth: 1,
        author: 'User A',
        children: []
      },
      {
        id: h2Id,
        type: 'heading',
        content: 'CRDT WebSocket Routing & Matrix Architecture',
        properties: { level: 2 },
        parentId: rootId,
        order: 3,
        depth: 1,
        author: 'System',
        children: []
      },
      {
        id: p2Id,
        type: 'paragraph',
        content: 'As User A types a new paragraph, User B concurrently adds a code block lower down the page. The system AST conflict resolution ensures neither edit is lost while broadcasting localized operational block-locking states in real-time.',
        properties: {},
        parentId: rootId,
        order: 4,
        depth: 1,
        author: 'User A',
        children: []
      },
      {
        id: codeId,
        type: 'code_block',
        content: `// Yjs CRDT Concurrent Mutation Handler
function mergeASTNodes(ydoc, mutation) {
  const yNodes = ydoc.getArray('astNodes');
  ydoc.transact(() => {
    if (mutation.action === 'INSERT') {
      yNodes.insert(mutation.index, [mutation.block]);
    } else if (mutation.action === 'UPDATE') {
      // Deterministic field-level CRDT merge
      yNodes.delete(mutation.index, 1);
      yNodes.insert(mutation.index, [mutation.block]);
    }
  });
}`,
        properties: { language: 'javascript' },
        parentId: rootId,
        order: 5,
        depth: 1,
        author: 'User B',
        children: []
      },
      {
        id: h3Id,
        type: 'heading',
        content: 'Mongoose Pre-Save Recursive Hooks',
        properties: { level: 3 },
        parentId: rootId,
        order: 6,
        depth: 1,
        author: 'User B',
        children: []
      },
      {
        id: quoteId,
        type: 'blockquote',
        content: 'Recursive pre-save hooks trace block relationships, ensure acyclic hierarchy, and normalize sibling ordering before persisting to MongoDB.',
        properties: {},
        parentId: rootId,
        order: 7,
        depth: 1,
        author: 'Lead Architect',
        children: []
      },
      {
        id: listId,
        type: 'list',
        content: '',
        properties: { ordered: false },
        parentId: rootId,
        order: 8,
        depth: 1,
        author: 'System',
        children: [
          {
            id: uuidv4(),
            type: 'list_item',
            content: 'AST Database with Express & Mongoose validation hooks',
            properties: { checked: true },
            parentId: listId,
            order: 0,
            depth: 2,
            children: []
          },
          {
            id: uuidv4(),
            type: 'list_item',
            content: 'Synchronization Engine via Node.js WebSocket & Yjs CRDTs',
            properties: { checked: true },
            parentId: listId,
            order: 1,
            depth: 2,
            children: []
          },
          {
            id: uuidv4(),
            type: 'list_item',
            content: 'Custom React Block Editor with localized operational block-locking',
            properties: { checked: true },
            parentId: listId,
            order: 2,
            depth: 2,
            children: []
          },
          {
            id: uuidv4(),
            type: 'list_item',
            content: 'DOMPurify transformation pipeline for HTML/PDF export',
            properties: { checked: true },
            parentId: listId,
            order: 3,
            depth: 2,
            children: []
          }
        ]
      },
      {
        id: dividerId,
        type: 'divider',
        content: '',
        properties: {},
        parentId: rootId,
        order: 9,
        depth: 1,
        author: 'System',
        children: []
      }
    ]
  };
}

// 1. List Documents
router.get('/documents', async (req, res) => {
  try {
    const docs = await Document.find({ isArchived: false })
      .select('title description stats version updatedAt createdAt')
      .sort({ updatedAt: -1 });

    // Auto-seed if database is empty
    if (docs.length === 0) {
      const seeded = await Document.create({
        title: 'Technical Spec: SyncDoc Distributed Engine',
        description: 'Collaborative Document Engine with AST Conflict Resolution and real-time CRDT replication.',
        rootNode: createTechnicalSpecAST()
      });
      return res.json([seeded]);
    }

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create Document
router.post('/documents', async (req, res) => {
  try {
    const { title, description, template } = req.body;

    let rootNode = null;
    if (template === 'technical_spec') {
      rootNode = createTechnicalSpecAST();
    } else {
      const rootId = uuidv4();
      rootNode = {
        id: rootId,
        type: 'root',
        content: '',
        properties: {},
        parentId: null,
        order: 0,
        depth: 0,
        children: [
          {
            id: uuidv4(),
            type: 'heading',
            content: title || 'Untitled Technical Document',
            properties: { level: 1 },
            parentId: rootId,
            order: 0,
            depth: 1,
            children: []
          },
          {
            id: uuidv4(),
            type: 'paragraph',
            content: 'Start writing your document here or invite collaborators...',
            properties: {},
            parentId: rootId,
            order: 1,
            depth: 1,
            children: []
          }
        ]
      };
    }

    const doc = new Document({
      title: title || 'Untitled Document',
      description: description || '',
      rootNode
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Get Single Document with full AST
router.get('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Document
router.put('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (req.body.title !== undefined) doc.title = req.body.title;
    if (req.body.description !== undefined) doc.description = req.body.description;
    if (req.body.rootNode) doc.rootNode = req.body.rootNode;

    await doc.save(); // Triggers Mongoose pre-save AST hooks
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Delete Document
router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ message: 'Document deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. AST Validation Hook Runner
router.post('/documents/validate-ast', (req, res) => {
  try {
    const { rootNode } = req.body;
    if (!rootNode) {
      return res.status(400).json({ valid: false, error: 'Missing rootNode in request body' });
    }
    const stats = traceAndValidateAST(rootNode);
    res.json({ valid: true, stats });
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

// 7. Export Sanitized HTML
router.get('/documents/:id/export/html', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const html = generatePrintableHTML(doc.title, doc.rootNode);
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.title)}.html"`);
      return res.send(html);
    }

    res.json({ html, sanitized: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Export Markdown
router.get('/documents/:id/export/markdown', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const markdown = astToMarkdown(doc.rootNode);
    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.title)}.md"`);
      return res.send(markdown);
    }

    res.json({ markdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Import Markdown to AST
router.post('/documents/:id/import/markdown', async (req, res) => {
  try {
    const { markdown } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const newRootNode = markdownToAST(markdown);
    doc.rootNode = newRootNode;
    await doc.save(); // Validates AST with recursive pre-save hook

    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Direct XSS Sanitization Endpoint for Verification
router.post('/sanitize-check', (req, res) => {
  const { input } = req.body;
  const sanitized = sanitizeHTML(input || '');
  res.json({
    original: input,
    sanitized,
    isClean: !/<script|onerror|onload|javascript:/i.test(sanitized)
  });
});

export default router;
