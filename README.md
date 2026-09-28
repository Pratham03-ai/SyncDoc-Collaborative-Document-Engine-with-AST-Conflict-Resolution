# SyncDoc - Collaborative Document Engine with AST Conflict Resolution

A real-time collaborative document editor that uses Abstract Syntax Trees (AST) and Conflict-free Replicated Data Types (CRDT) to prevent destructive overwrites when multiple users edit the same document simultaneously.

## 🌟 Features

- **Real-time Collaboration**: Multiple users can edit the same document simultaneously without conflicts
- **AST-based Storage**: Documents stored as structured Abstract Syntax Trees in MongoDB
- **CRDT Synchronization**: Uses Yjs for conflict-free data replication
- **Block-based Editor**: Individual editable blocks for paragraphs, headings, code blocks, lists, and more
- **User Presence**: Live indicators showing who is currently editing
- **Block-level Locking**: Visual indicators for which blocks are being edited by which users
- **XSS Protection**: Server-side DOMPurify sanitization for HTML exports
- **Markdown Support**: Import/export documents in Markdown format
- **PDF Export**: Generate printable HTML documents with PDF export capability

## 🛠 Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Yjs** - CRDT library for real-time collaboration
- **Lucide React** - Icon library
- **Tailwind CSS** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database (in-memory for development)
- **Mongoose** - ODM for MongoDB
- **WebSocket** - Real-time communication
- **DOMPurify** - XSS sanitization
- **JSDOM** - Server-side DOM manipulation

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
cd /Users/prathamvinodverma/Desktop/SyncDoc
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the application**
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:3006
```

## 🚀 Running the Project

### Development Mode
```bash
npm run dev
```
This starts both the backend server (port 5001) and frontend dev server (port 3006) simultaneously.

### Individual Servers

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run client
```

### Production Build
```bash
npm run build
```

## 📁 Project Structure

```
SyncDoc/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ASTBlock.jsx
│   │   │   ├── Editor.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── DocumentBrowser.jsx
│   │   │   ├── ConflictSimulator.jsx
│   │   │   ├── MarkdownLayoutDiagram.jsx
│   │   │   └── ExportModal.jsx
│   │   ├── services/      # API and CRDT client
│   │   │   ├── api.js
│   │   │   └── crdtClient.js
│   │   ├── App.jsx        # Main React app
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── index.html
│   └── vite.config.js     # Vite configuration
├── server/                # Node.js backend
│   ├── models/            # Mongoose schemas
│   │   ├── ASTNode.js
│   │   └── Document.js
│   ├── routes/            # Express API routes
│   │   └── api.js
│   ├── services/          # Business logic
│   │   ├── crdtSync.js    # CRDT synchronization
│   │   └── transformationPipeline.js  # HTML/Markdown conversion
│   ├── db.js              # Database connection
│   └── index.js           # Server entry point
├── tests/                 # Test files
│   ├── stress-test.js     # Concurrent client testing
│   ├── ast-validation.test.js
│   └── transformation-pipeline.test.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🔌 API Endpoints

### Documents
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get specific document
- `POST /api/documents` - Create new document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Export/Import
- `GET /api/documents/:id/export/html` - Export as HTML
- `GET /api/documents/:id/export/markdown` - Export as Markdown
- `POST /api/documents/:id/import/markdown` - Import Markdown

### Validation
- `POST /api/documents/validate-ast` - Validate AST structure

### WebSocket
- `WS /ws?docId=:id&userId=:userId&userName=:name&userColor=:color` - Real-time collaboration

## 🎯 Usage

### Basic Editing

1. **Open a document** - Click on any document in the sidebar
2. **Add blocks** - Use the "Add Block" buttons at the bottom
3. **Edit content** - Click on any block to edit its text
4. **Change block type** - Use the block type selector in the toolbar
5. **Reorder blocks** - Use the up/down arrows
6. **Delete blocks** - Use the trash icon

### Collaborative Editing

1. **Open the same document** in two different browser windows
2. **Edit simultaneously** - Each user can edit different blocks
3. **See presence** - User indicators show who is editing
4. **Block locking** - Visual indicators show which blocks are being edited

### Export Options

- **HTML Export** - Generate sanitized HTML with styling
- **PDF Export** - Print/export to PDF from HTML
- **Markdown Export** - Export as Markdown format
- **JSON Export** - Export AST structure as JSON
- **Markdown Import** - Import Markdown and convert to AST

## 🧪 Testing

### Stress Test
Test concurrent editing with 10 simultaneous clients:
```bash
npm run test:stress
```

### Unit Tests
```bash
npm test
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/syncdoc
```

### Port Configuration
- Frontend port: Set in `client/vite.config.js` (default: 3006)
- Backend port: Set in `server/index.js` or `PORT` env variable (default: 5001)

## 🎨 AST Node Types

Supported block types:
- `root` - Document root node
- `heading` - Headings (levels 1-6)
- `paragraph` - Text paragraphs
- `code_block` - Code snippets with language support
- `blockquote` - Quoted text
- `callout` - Callout banners (info, warning, tip, danger)
- `list` - Ordered/unordered lists
- `list_item` - List items
- `divider` - Horizontal dividers
- `table` - Tables

## 🔒 Security Features

- **XSS Protection**: DOMPurify sanitization on server-side
- **AST Validation**: Recursive validation before database saves
- **Cycle Detection**: Prevents circular references in AST
- **Input Sanitization**: All user inputs are validated and sanitized

## 🚧 Current Limitations

- No user authentication (demo purposes only)
- In-memory MongoDB (data lost on restart)
- Basic block types (can be extended)
- No revision history
- No offline support

## 📈 Future Enhancements

- User authentication and authorization
- Persistent MongoDB with proper configuration
- Revision history and document versioning
- Offline support with local storage
- More block types (tables, images, embeds)
- Rich text formatting within blocks
- Mobile-responsive design improvements
- Performance optimizations for large documents

## 🤝 Contributing

This is a college project for demonstration purposes. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is created for educational purposes.

## 👥 Authors

- **Pratham Verma** - Project Developer

## 🙏 Acknowledgments

- Yjs for CRDT implementation
- Mongoose for MongoDB ODM
- React for the frontend framework
- Express for the backend framework

## 📞 Support

For issues or questions, please contact the project maintainer or open an issue in the repository.

---

**Built with ❤️ for college project demonstration**