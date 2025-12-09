import express from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { app } from 'electron';

interface Machine {
  id: string;
  name: string;
  password: string;
  createdAt: string;
}

interface Project {
  id: string;
  machineId: string;
  name: string;
  created: string;
  url: string;
  status: string;
  apiKeys: { anon: string; service: string };
}

interface TableColumn {
  name: string;
  type: string;
  primary?: boolean;
}

interface TableData {
  id: string;
  projectId: string;
  name: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

interface AuthUser {
  id: string;
  projectId: string;
  email: string;
  password: string;
  created_at: string;
}

interface StorageBucket {
  id: string;
  projectId: string;
  name: string;
  public: boolean;
  created_at: string;
}

interface StorageFile {
  id: string;
  bucketId: string;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  created_at: string;
}

interface Database {
  machines: Machine[];
  projects: Project[];
  tables: TableData[];
  authUsers: AuthUser[];
  buckets: StorageBucket[];
  files: StorageFile[];
}

// Используем постоянную папку для данных приложения
const DB_PATH = path.join(app.getPath('userData'), 'database.json');
const STORAGE_PATH = path.join(app.getPath('userData'), 'storage');

// Создаем папку storage если её нет
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

function loadDatabase(): Database {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
  return {
    machines: [],
    projects: [],
    tables: [],
    authUsers: [],
    buckets: [],
    files: []
  };
}

function saveDatabase(db: Database): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

let db = loadDatabase();

export async function startServer(): Promise<string> {
  const app = express();
  const PORT = 3030;

  app.use(express.json());

  // Machine Authentication
  app.post('/api/machines/register', (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'Имя и пароль обязательны' });
    }
    const existing = db.machines.find(m => m.name === name);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    const machine: Machine = {
      id: uuidv4(),
      name,
      password,
      createdAt: new Date().toISOString()
    };
    db.machines.push(machine);
    saveDatabase(db);
    res.json({
      token: machine.id,
      machine: { id: machine.id, name: machine.name }
    });
  });

  app.post('/api/machines/login', (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'Имя и пароль обязательны' });
    }
    const machine = db.machines.find(m => m.name === name && m.password === password);
    if (!machine) {
      return res.status(401).json({ error: 'Неверное имя или пароль' });
    }
    res.json({
      token: machine.id,
      machine: { id: machine.id, name: machine.name }
    });
  });

  // Projects
  app.get('/api/admin/projects', (req, res) => {
    const machineId = req.headers['x-machine-id'] as string;
    if (!machineId) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const projects = db.projects.filter(p => p.machineId === machineId);
    res.json(projects);
  });

  app.post('/api/admin/projects', (req, res) => {
    const machineId = req.headers['x-machine-id'] as string;
    const { name } = req.body;
    if (!machineId) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Название проекта обязательно' });
    }
    const project: Project = {
      id: uuidv4(),
      machineId,
      name,
      created: new Date().toISOString(),
      url: `http://127.0.0.1:${PORT}/api/projects/${uuidv4()}`,
      status: 'active',
      apiKeys: {
        anon: 'pk_anon_' + uuidv4().replace(/-/g, ''),
        service: 'sk_service_' + uuidv4().replace(/-/g, '')
      }
    };
    db.projects.push(project);
    saveDatabase(db);
    res.json({ project, apiKeys: project.apiKeys });
  });

  app.delete('/api/admin/projects/:id', (req, res) => {
    const machineId = req.headers['x-machine-id'] as string;
    const { id } = req.params;
    const projectIndex = db.projects.findIndex(p => p.id === id && p.machineId === machineId);
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    db.projects.splice(projectIndex, 1);
    db.tables = db.tables.filter(t => t.projectId !== id);
    db.authUsers = db.authUsers.filter(u => u.projectId !== id);
    db.buckets = db.buckets.filter(b => b.projectId !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Tables
  app.get('/api/admin/projects/:projectId/tables', (req, res) => {
    const { projectId } = req.params;
    // Перезагружаем БД перед каждым запросом
    db = loadDatabase();
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    const tables = db.tables.filter(t => t.projectId === projectId);
    res.json(tables);
  });

  app.post('/api/admin/projects/:projectId/tables', (req, res) => {
    const { projectId } = req.params;
    const { name } = req.body;
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Название таблицы обязательно' });
    }
    const existing = db.tables.find(t => t.projectId === projectId && t.name === name);
    if (existing) {
      return res.status(400).json({ error: 'Таблица с таким именем уже существует' });
    }
    const table: TableData = {
      id: uuidv4(),
      projectId,
      name,
      columns: [{ name: 'id', type: 'uuid', primary: true }],
      rows: []
    };
    db.tables.push(table);
    saveDatabase(db);
    res.json(table);
  });

  app.delete('/api/admin/projects/:projectId/tables/:tableName', (req, res) => {
    const { projectId, tableName } = req.params;
    const tableIndex = db.tables.findIndex(t => t.projectId === projectId && t.name === tableName);
    if (tableIndex === -1) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }
    db.tables.splice(tableIndex, 1);
    saveDatabase(db);
    res.json({ success: true });
  });

  app.post('/api/admin/projects/:projectId/tables/:tableId/columns', (req, res) => {
    const { projectId, tableId } = req.params;
    const { name, type } = req.body;
    const table = db.tables.find(t => t.projectId === projectId && t.id === tableId);
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }
    if (!name || !type) {
      return res.status(400).json({ error: 'Название и тип колонки обязательны' });
    }
    const existingCol = table.columns.find(c => c.name === name);
    if (existingCol) {
      return res.status(400).json({ error: 'Колонка с таким именем уже существует' });
    }
    table.columns.push({ name, type });
    saveDatabase(db);
    res.json(table);
  });

  // Table data operations (REST API for data)
  app.get('/api/projects/:projectId/:tableName', (req, res) => {
    const { projectId, tableName } = req.params;
    db = loadDatabase();
    const table = db.tables.find(t => t.projectId === projectId && t.name === tableName);
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }
    res.json(table.rows);
  });

  app.post('/api/projects/:projectId/:tableName', (req, res) => {
    const { projectId, tableName } = req.params;
    db = loadDatabase();
    const table = db.tables.find(t => t.projectId === projectId && t.name === tableName);
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }
    const newRow = { id: uuidv4(), ...req.body };
    table.rows.push(newRow);
    saveDatabase(db);
    res.json(newRow);
  });

  app.put('/api/projects/:projectId/:tableName/:rowId', (req, res) => {
    const { projectId, tableName, rowId } = req.params;
    const table = db.tables.find(t => t.projectId === projectId && t.name === tableName);
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }
    const rowIndex = table.rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    table.rows[rowIndex] = { ...table.rows[rowIndex], ...req.body };
    saveDatabase(db);
    res.json(table.rows[rowIndex]);
  });

  app.delete('/api/projects/:projectId/:tableName/:rowId', (req, res) => {
    const { projectId, tableName, rowId } = req.params;
    db = loadDatabase();
    const table = db.tables.find(t => t.projectId === projectId && t.name === tableName);
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }
    const rowIndex = table.rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    table.rows.splice(rowIndex, 1);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Auth Users
  app.get('/api/admin/projects/:projectId/auth/users', (req, res) => {
    const { projectId } = req.params;
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    const users = db.authUsers.filter(u => u.projectId === projectId).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at
    }));
    res.json(users);
  });

  app.post('/api/admin/projects/:projectId/auth/users', (req, res) => {
    const { projectId } = req.params;
    const { email, password } = req.body;
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    const existing = db.authUsers.find(u => u.projectId === projectId && u.email === email);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    const user: AuthUser = {
      id: uuidv4(),
      projectId,
      email,
      password,
      created_at: new Date().toISOString()
    };
    db.authUsers.push(user);
    saveDatabase(db);
    res.json({ id: user.id, email: user.email, created_at: user.created_at });
  });

  app.delete('/api/admin/projects/:projectId/auth/users/:userId', (req, res) => {
    const { projectId, userId } = req.params;
    const userIndex = db.authUsers.findIndex(u => u.projectId === projectId && u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    db.authUsers.splice(userIndex, 1);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Client auth endpoints (for apps using the database)
  app.post('/api/projects/:projectId/auth/signup', (req, res) => {
    const { projectId } = req.params;
    const { email, password } = req.body;
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    const existing = db.authUsers.find(u => u.projectId === projectId && u.email === email);
    if (existing) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    const user: AuthUser = {
      id: uuidv4(),
      projectId,
      email,
      password,
      created_at: new Date().toISOString()
    };
    db.authUsers.push(user);
    saveDatabase(db);
    res.json({ user: { id: user.id, email: user.email }, token: uuidv4() });
  });

  app.post('/api/projects/:projectId/auth/login', (req, res) => {
    const { projectId } = req.params;
    const { email, password } = req.body;
    const user = db.authUsers.find(u => u.projectId === projectId && u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    res.json({ user: { id: user.id, email: user.email }, token: uuidv4() });
  });

  // Storage Buckets
  app.get('/api/admin/projects/:projectId/storage/buckets', (req, res) => {
    const { projectId } = req.params;
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    const buckets = db.buckets.filter(b => b.projectId === projectId);
    res.json(buckets);
  });

  app.post('/api/admin/projects/:projectId/storage/buckets', (req, res) => {
    const { projectId } = req.params;
    const { name, public: isPublic } = req.body;
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Название bucket обязательно' });
    }
    const existing = db.buckets.find(b => b.projectId === projectId && b.name === name);
    if (existing) {
      return res.status(400).json({ error: 'Bucket с таким именем уже существует' });
    }
    const bucket: StorageBucket = {
      id: uuidv4(),
      projectId,
      name,
      public: isPublic || false,
      created_at: new Date().toISOString()
    };
    db.buckets.push(bucket);
    saveDatabase(db);
    res.json(bucket);
  });

  app.delete('/api/admin/projects/:projectId/storage/buckets/:bucketName', (req, res) => {
    const { projectId, bucketName } = req.params;
    const bucketIndex = db.buckets.findIndex(b => b.projectId === projectId && b.name === bucketName);
    if (bucketIndex === -1) {
      return res.status(404).json({ error: 'Bucket не найден' });
    }
    const bucket = db.buckets[bucketIndex];
    db.files = db.files.filter(f => f.bucketId !== bucket.id);
    db.buckets.splice(bucketIndex, 1);
    saveDatabase(db);
    res.json({ success: true });
  });

  app.get('/api/admin/projects/:projectId/storage/buckets/:bucketName/files', (req, res) => {
    const { projectId, bucketName } = req.params;
    const bucket = db.buckets.find(b => b.projectId === projectId && b.name === bucketName);
    if (!bucket) {
      return res.status(404).json({ error: 'Bucket не найден' });
    }
    const files = db.files.filter(f => f.bucketId === bucket.id);
    res.json(files);
  });

  // Serve static files from the renderer build
  const staticPath = path.join(__dirname, '../renderer');
  app.use(express.static(staticPath));

  // Serve index.html for all other routes (SPA)
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
