import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { connectDB, disconnectDB } from '../server/db.js';
import { Document, traceAndValidateAST } from '../server/models/Document.js';

describe('AST Modeling & Recursive Mongoose Pre-Save Hooks', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('should successfully save a structured AST document and compute tree statistics', async () => {
    const rootId = uuidv4();
    const h1Id = uuidv4();
    const p1Id = uuidv4();
    const codeId = uuidv4();

    const doc = new Document({
      title: 'Distributed System Spec',
      description: 'AST Architecture Documentation',
      rootNode: {
        id: rootId,
        type: 'root',
        content: '',
        parentId: null,
        order: 0,
        depth: 0,
        children: [
          {
            id: h1Id,
            type: 'heading',
            content: 'Architecture Overview',
            properties: { level: 1 },
            parentId: rootId,
            order: 0,
            depth: 1,
            children: []
          },
          {
            id: p1Id,
            type: 'paragraph',
            content: 'The document engine maintains consistency using CRDT matrix replication.',
            properties: {},
            parentId: rootId,
            order: 1,
            depth: 1,
            children: []
          },
          {
            id: codeId,
            type: 'code_block',
            content: 'console.log("CRDT synced");',
            properties: { language: 'typescript' },
            parentId: rootId,
            order: 2,
            depth: 1,
            children: []
          }
        ]
      }
    });

    await doc.save();

    expect(doc.version).toBe(1);
    expect(doc.stats.totalBlocks).toBe(4); // root + 3 children
    expect(doc.stats.codeBlocks).toBe(1);
    expect(doc.stats.maxDepth).toBe(1);
    expect(doc.stats.wordCount).toBeGreaterThan(5);

    // Verify parentId alignment and depth
    expect(doc.rootNode.children[0].parentId).toBe(rootId);
    expect(doc.rootNode.children[0].depth).toBe(1);
    expect(doc.rootNode.children[1].parentId).toBe(rootId);
    expect(doc.rootNode.children[2].parentId).toBe(rootId);
  });

  it('should normalize sibling orders automatically when disordered or collided', async () => {
    const rootId = uuidv4();
    const doc = new Document({
      title: 'Order Normalization Test',
      rootNode: {
        id: rootId,
        type: 'root',
        children: [
          { id: uuidv4(), type: 'paragraph', content: 'Block C', order: 10 },
          { id: uuidv4(), type: 'paragraph', content: 'Block A', order: 2 },
          { id: uuidv4(), type: 'paragraph', content: 'Block B', order: 2 } // Collision
        ]
      }
    });

    await doc.save();

    const orders = doc.rootNode.children.map(c => c.order);
    expect(orders).toEqual([0, 1, 2]);
    // The items should be stably sorted
    expect(doc.rootNode.children[2].content).toBe('Block C');
  });

  it('should detect duplicate node IDs and reject invalid AST trees', async () => {
    const rootId = uuidv4();
    const duplicateId = uuidv4();

    const invalidTree = {
      id: rootId,
      type: 'root',
      children: [
        { id: duplicateId, type: 'paragraph', content: 'Paragraph 1', children: [] },
        { id: duplicateId, type: 'paragraph', content: 'Paragraph 2 with duplicate ID', children: [] }
      ]
    };

    expect(() => traceAndValidateAST(invalidTree)).toThrowError(/duplicate node ID detected/i);
  });

  it('should enforce proper heading levels in pre-save validation', async () => {
    const rootId = uuidv4();
    const doc = new Document({
      title: 'Heading Level Test',
      rootNode: {
        id: rootId,
        type: 'root',
        children: [
          { id: uuidv4(), type: 'heading', content: 'Invalid Level 99', properties: { level: 99 }, children: [] },
          { id: uuidv4(), type: 'heading', content: 'Invalid Level 0', properties: { level: 0 }, children: [] }
        ]
      }
    });

    await doc.save();

    expect(doc.rootNode.children[0].properties.level).toBe(6);
    expect(doc.rootNode.children[1].properties.level).toBe(1);
  });
});
