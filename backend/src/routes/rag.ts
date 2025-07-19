import { Hono } from 'hono';
import { graphRAGAnswerHandler } from '../controllers/ragController';

const ragRoutes = new Hono();

ragRoutes.post('/graphrag', graphRAGAnswerHandler);

export { ragRoutes };
