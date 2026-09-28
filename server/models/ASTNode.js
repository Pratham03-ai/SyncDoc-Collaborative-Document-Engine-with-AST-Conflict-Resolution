import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const { Schema } = mongoose;

export const AST_NODE_TYPES = [
  'root',
  'section',
  'heading',
  'paragraph',
  'code_block',
  'blockquote',
  'callout',
  'list',
  'list_item',
  'divider',
  'table'
];

export const NodePropertiesSchema = new Schema(
  {
    level: {
      type: Number,
      min: 1,
      max: 6,
      default: 1
    },
    language: {
      type: String,
      default: 'javascript',
      trim: true
    },
    calloutType: {
      type: String,
      enum: ['info', 'warning', 'tip', 'danger'],
      default: 'info'
    },
    checked: {
      type: Boolean,
      default: false
    },
    ordered: {
      type: Boolean,
      default: false
    },
    align: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left'
    }
  },
  { _id: false, strict: false }
);

export const ASTNodeSchema = new Schema({
  id: {
    type: String,
    required: true,
    default: () => uuidv4()
  },
  type: {
    type: String,
    required: true,
    enum: AST_NODE_TYPES,
    default: 'paragraph'
  },
  content: {
    type: String,
    default: ''
  },
  properties: {
    type: NodePropertiesSchema,
    default: () => ({})
  },
  parentId: {
    type: String,
    default: null
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  depth: {
    type: Number,
    default: 0
  },
  author: {
    type: String,
    default: 'Engineer'
  },
  lastModifiedBy: {
    type: String,
    default: 'Engineer'
  },
  version: {
    type: Number,
    default: 1
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: () => ({})
  }
});

// Recursive self-referential children definition
ASTNodeSchema.add({
  children: [ASTNodeSchema]
});
