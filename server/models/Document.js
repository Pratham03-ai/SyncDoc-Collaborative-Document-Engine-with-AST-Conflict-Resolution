import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ASTNodeSchema } from './ASTNode.js';

const { Schema } = mongoose;

const DocumentSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Untitled Document'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    rootNode: {
      type: ASTNodeSchema,
      required: true,
      default: () => ({
        id: uuidv4(),
        type: 'root',
        content: '',
        properties: {},
        parentId: null,
        order: 0,
        depth: 0,
        children: []
      })
    },
    stats: {
      totalBlocks: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      codeBlocks: { type: Number, default: 0 },
      maxDepth: { type: Number, default: 0 }
    },
    collaborators: [
      {
        id: String,
        name: String,
        color: String,
        lastActiveAt: Date
      }
    ],
    version: {
      type: Number,
      default: 1
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/**
 * Recursive validation and relationship tracing for Document AST.
 * Enforces cycle detection, parent-child referential integrity,
 * sibling order normalization, depth calculation, and aggregated statistics.
 */
function traceAndValidateAST(rootNode) {
  if (!rootNode) {
    throw new Error('Document must have a valid root AST node.');
  }

  const visitedNodeIds = new Set();
  const ancestorStack = [];
  let totalBlocks = 0;
  let wordCount = 0;
  let codeBlocks = 0;
  let maxDepth = 0;

  function traverse(node, parentNode = null, currentDepth = 0) {
    if (!node.id) {
      node.id = uuidv4();
    }

    // 1. Cycle & Duplicate Node ID Detection
    if (visitedNodeIds.has(node.id)) {
      throw new Error(
        `AST Integrity Violation: Cyclic or duplicate node ID detected: "${node.id}". Node appears multiple times in AST.`
      );
    }
    if (ancestorStack.includes(node.id)) {
      throw new Error(
        `AST Cyclic Dependency Error: Node "${node.id}" cannot be an ancestor of itself. Trajectory: [${ancestorStack.join(' -> ')} -> ${node.id}]`
      );
    }

    visitedNodeIds.add(node.id);
    ancestorStack.push(node.id);

    // 2. Parent-Child Relationship Integrity
    if (parentNode) {
      node.parentId = parentNode.id;
      node.depth = currentDepth;
    } else {
      node.parentId = null;
      node.depth = 0;
    }

    if (node.depth > maxDepth) {
      maxDepth = node.depth;
    }

    // 3. Node Type Specific Rule Validations
    if (node.type === 'heading') {
      if (!node.properties) node.properties = {};
      const lvl = Number(node.properties.level) || 1;
      node.properties.level = Math.min(Math.max(lvl, 1), 6);
    } else if (node.type === 'code_block') {
      codeBlocks++;
      if (!node.properties) node.properties = {};
      if (!node.properties.language) node.properties.language = 'javascript';
    } else if (node.type === 'list') {
      // Validate list children are list items
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          if (child.type !== 'list_item') {
            child.type = 'list_item';
          }
        }
      }
    }

    // Accumulate word count from content
    totalBlocks++;
    if (typeof node.content === 'string' && node.content.trim()) {
      const words = node.content.trim().split(/\s+/).length;
      wordCount += words;
    }

    // 4. Recursive Child Traversal & Sibling Order Normalization
    if (Array.isArray(node.children) && node.children.length > 0) {
      // Sort children deterministically by their order property (or stable index if not set)
      node.children.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 0;
        const orderB = typeof b.order === 'number' ? b.order : 0;
        return orderA - orderB;
      });

      // Normalize sibling ordering: assign 0, 1, 2, ...
      node.children.forEach((child, idx) => {
        child.order = idx;
        traverse(child, node, currentDepth + 1);
      });
    } else {
      node.children = [];
    }

    ancestorStack.pop();
  }

  traverse(rootNode, null, 0);

  return {
    totalBlocks,
    wordCount,
    codeBlocks,
    maxDepth
  };
}

// Recursive AST hook for pre-validation and pre-save
function applyASTTracing(doc) {
  if (!doc.rootNode) {
    doc.rootNode = {
      id: uuidv4(),
      type: 'root',
      content: '',
      properties: {},
      parentId: null,
      order: 0,
      depth: 0,
      children: []
    };
  }
  const stats = traceAndValidateAST(doc.rootNode);
  doc.stats = stats;
}

DocumentSchema.pre('validate', function (next) {
  try {
    applyASTTracing(this);
    next();
  } catch (err) {
    next(err);
  }
});

DocumentSchema.pre('save', function (next) {
  try {
    applyASTTracing(this);
    this.increment();
    next();
  } catch (err) {
    next(err);
  }
});

// Helper instance methods
DocumentSchema.methods.findNodeById = function (nodeId) {
  function search(node) {
    if (node.id === nodeId) return node;
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
    }
    return null;
  }
  return search(this.rootNode);
};

DocumentSchema.methods.flattenNodes = function () {
  const result = [];
  function flatten(node, parentPath = '') {
    const currentPath = parentPath ? `${parentPath} > ${node.type}#${node.id.slice(0, 6)}` : node.type;
    result.push({
      ...node.toObject ? node.toObject() : node,
      treePath: currentPath
    });
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        flatten(child, currentPath);
      }
    }
  }
  flatten(this.rootNode);
  return result;
};

export const Document = mongoose.model('Document', DocumentSchema);
export { traceAndValidateAST };
