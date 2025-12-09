import express from 'express';
import path from 'path';

export async function startServer(): Promise<string> {
  const app = express();
  const PORT = 3030;

  // Parse JSON bodies
  app.use(express.json());

  // API endpoints
  app.post('/api/machines/login', (req, res) => {
    const { name, password } = req.body;
    // Mock login endpoint
    const machine = {
      id: 'machine-' + Date.now(),
      name: name || 'default-machine'
    };
    res.json({ 
      token: 'mock-token-' + Date.now(),
      machine
    });
  });

  app.post('/api/machines/register', (req, res) => {
    const { name, password } = req.body;
    // Mock register endpoint
    const machine = {
      id: 'machine-' + Date.now(),
      name: name || 'default-machine'
    };
    res.json({ 
      token: 'mock-token-' + Date.now(),
      machine
    });
  });

  // Project management endpoints
  app.get('/api/admin/projects', (req, res) => {
    res.json([]);
  });

  app.post('/api/admin/projects', (req, res) => {
    const { name } = req.body;
    const project = {
      id: Date.now().toString(),
      name,
      created: new Date().toISOString(),
      url: `http://127.0.0.1:3030/api/projects/${Date.now()}`,
      status: 'active'
    };
    const apiKeys = {
      anon: 'pk_anon_' + Math.random().toString(36).substring(7),
      service: 'sk_service_' + Math.random().toString(36).substring(7)
    };
    res.json({ 
      ...project,
      apiKeys
    });
  });

  app.delete('/api/admin/projects/:id', (req, res) => {
    res.json({ success: true });
  });

  // Serve static files from the renderer build
  const staticPath = path.join(__dirname, '../renderer');
  app.use(express.static(staticPath));

  // Serve index.html for all routes (SPA)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  return new Promise((resolve) => {
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`Server running on http://127.0.0.1:${PORT}`);
      resolve(`http://127.0.0.1:${PORT}`);
    });
  });
}