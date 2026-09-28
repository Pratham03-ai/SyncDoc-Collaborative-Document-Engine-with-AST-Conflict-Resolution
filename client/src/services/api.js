const BASE_URL = '/api';

export async function fetchDocuments() {
  const res = await fetch(`${BASE_URL}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function fetchDocument(id) {
  const res = await fetch(`${BASE_URL}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.json();
}

export async function createDocument(data) {
  const res = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create document');
  return res.json();
}

export async function updateDocument(id, data) {
  const res = await fetch(`${BASE_URL}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update document');
  }
  return res.json();
}

export async function deleteDocument(id) {
  const res = await fetch(`${BASE_URL}/documents/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function validateAST(rootNode) {
  const res = await fetch(`${BASE_URL}/documents/validate-ast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rootNode })
  });
  return res.json();
}

export async function exportHTML(id) {
  const res = await fetch(`${BASE_URL}/documents/${id}/export/html`);
  if (!res.ok) throw new Error('Failed to export HTML');
  return res.json();
}

export async function exportMarkdown(id) {
  const res = await fetch(`${BASE_URL}/documents/${id}/export/markdown`);
  if (!res.ok) throw new Error('Failed to export Markdown');
  return res.json();
}

export async function importMarkdown(id, markdown) {
  const res = await fetch(`${BASE_URL}/documents/${id}/import/markdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to import markdown');
  }
  return res.json();
}
