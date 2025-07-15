import { Hono } from 'hono';
import graphRagRoutes from './graphRagRoutes';

const api = new Hono();

// GraphRAG endpoints
api.route('/graphrag', graphRagRoutes);

// Task management endpoints (stub)
api.post('/tasks', async (c) => c.json({ status: 'not_implemented', message: 'Create task' }));
api.patch('/tasks/:id', async (c) => c.json({ status: 'not_implemented', message: 'Update task' }));
api.get('/tasks', async (c) => c.json({ status: 'not_implemented', message: 'List tasks' }));

// Pin/bookmark endpoints (stub)
api.post('/pins', async (c) => c.json({ status: 'not_implemented', message: 'Pin message' }));
api.delete('/pins/:id', async (c) => c.json({ status: 'not_implemented', message: 'Unpin message' }));

// Notes endpoints (stub)
api.post('/notes', async (c) => c.json({ status: 'not_implemented', message: 'Add note' }));

// File ingestion endpoints (stub)
api.post('/files/ingest', async (c) => c.json({ status: 'not_implemented', message: 'File ingest' }));

// Agent mode/personality endpoints (stub)
api.post('/agent/mode', async (c) => c.json({ status: 'not_implemented', message: 'Set agent mode' }));

// Conversation history/search endpoints (stub)
api.get('/conversations/search', async (c) => c.json({ status: 'not_implemented', message: 'Search conversations' }));

export default api; 