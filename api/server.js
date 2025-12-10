import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL must be set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

import * as schema from '../shared/schema.js';
const db = drizzle(pool, { schema });

const app = express();
const PORT = process.env.PORT || 3030;

const ADMIN_ACCOUNTS = {
  'Nokici1974': { id: 'acc_1974', name: 'Account 1974' },
  'Nokici1975': { id: 'acc_1975', name: 'Account 1975' },
  'Nokici1976': { id: 'acc_1976', name: 'Account 1976' },
  'Nokici1977': { id: 'acc_1977', name: 'Account 1977' },
  'Nokici1978': { id: 'acc_1978', name: 'Account 1978' },
  'Nokici1979': { id: 'acc_1979', name: 'Account 1979' },
  'Nokici1980': { id: 'acc_1980', name: 'Account 1980' },
};

const adminTokens = new Map();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token', 'apikey'],
}));

app.use(express.json({ limit: '50mb' }));

function generateApiKey(prefix) {
  return prefix + '_' + uuidv4().replace(/-/g, '');
}

function generateAdminToken() {
  return 'admin_' + uuidv4().replace(/-/g, '');
}

function validateAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Требуется авторизация администратора' });
  }
  
  req.accountId = adminTokens.get(token).accountId;
  req.accountName = adminTokens.get(token).accountName;
  next();
}

async function validateApiKey(req, res, next) {
  const apiKey = req.headers['apikey'] || req.headers['authorization']?.replace('Bearer ', '');
  const { projectId } = req.params;
  
  if (!projectId) {
    return next();
  }
  
  try {
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    
    if (apiKey && (apiKey === project.anonKey || apiKey === project.serviceKey)) {
      req.project = project;
      return next();
    }
    
    const adminToken = req.headers['x-admin-token'];
    if (adminToken && adminTokens.has(adminToken)) {
      req.project = project;
      return next();
    }
    
    return res.status(401).json({ error: 'Требуется API ключ или авторизация' });
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    const account = ADMIN_ACCOUNTS[password];
    if (!account) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = generateAdminToken();
    adminTokens.set(token, { accountId: account.id, accountName: account.name });

    res.json({
      token,
      accountId: account.id,
      accountName: account.name,
      message: 'Успешный вход'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) {
    adminTokens.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/auth/verify', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token && adminTokens.has(token)) {
    const account = adminTokens.get(token);
    res.json({ valid: true, accountId: account.accountId, accountName: account.accountName });
  } else {
    res.status(401).json({ valid: false });
  }
});

app.get('/api/admin/projects', validateAdminToken, async (req, res) => {
  try {
    const projectsList = await db.select().from(schema.projects).where(eq(schema.projects.accountId, req.accountId));
    const result = projectsList.map(p => ({
      id: p.id,
      name: p.name,
      created: p.created,
      url: p.url,
      status: p.status,
      apiKeys: { anon: p.anonKey, service: p.serviceKey }
    }));
    res.json(result);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/admin/projects', validateAdminToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Название проекта обязательно' });
    }

    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    const anonKey = generateApiKey('pk_anon');
    const serviceKey = generateApiKey('sk_service');

    const [project] = await db.insert(schema.projects).values({
      accountId: req.accountId,
      name,
      url: `${baseUrl}/api/projects/${uuidv4()}`,
      status: 'active',
      anonKey,
      serviceKey,
    }).returning();

    res.json({
      project: {
        id: project.id,
        name: project.name,
        created: project.created,
        url: project.url,
        status: project.status,
      },
      apiKeys: { anon: project.anonKey, service: project.serviceKey }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/projects/:id', validateAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [project] = await db.select().from(schema.projects).where(and(eq(schema.projects.id, id), eq(schema.projects.accountId, req.accountId)));
    
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    await db.delete(schema.projects).where(eq(schema.projects.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/admin/projects/:projectId/tables', validateAdminToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    const tablesList = await db.select().from(schema.tables).where(eq(schema.tables.projectId, projectId));
    res.json(tablesList);
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/admin/projects/:projectId/tables', validateAdminToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;

    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Название таблицы обязательно' });
    }

    const existing = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.name, name)));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Таблица с таким именем уже существует' });
    }

    const [table] = await db.insert(schema.tables).values({
      projectId,
      name,
      columns: [{ name: 'id', type: 'uuid', primary: true }],
      rows: [],
    }).returning();

    res.json(table);
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/projects/:projectId/tables/:tableName', validateAdminToken, async (req, res) => {
  try {
    const { projectId, tableName } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.name, tableName)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    await db.delete(schema.tables).where(eq(schema.tables.id, table.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/admin/projects/:projectId/tables/:tableId/columns', validateAdminToken, async (req, res) => {
  try {
    const { projectId, tableId } = req.params;
    const { name, type } = req.body;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.id, tableId)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }
    if (!name || !type) {
      return res.status(400).json({ error: 'Название и тип колонки обязательны' });
    }

    const columns = table.columns || [];
    if (columns.find(c => c.name === name)) {
      return res.status(400).json({ error: 'Колонка с таким именем уже существует' });
    }

    columns.push({ name, type });
    
    const [updated] = await db.update(schema.tables)
      .set({ columns })
      .where(eq(schema.tables.id, tableId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Add column error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/admin/projects/:projectId/tables/:tableId/columns/:columnName', validateAdminToken, async (req, res) => {
  try {
    const { projectId, tableId, columnName } = req.params;
    const { newName, newType } = req.body;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.id, tableId)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    const columns = table.columns || [];
    const colIndex = columns.findIndex(c => c.name === columnName);
    if (colIndex === -1) {
      return res.status(404).json({ error: 'Колонка не найдена' });
    }

    if (columns[colIndex].primary) {
      return res.status(400).json({ error: 'Нельзя изменить первичный ключ' });
    }

    if (newName && newName !== columnName && columns.some(c => c.name === newName)) {
      return res.status(400).json({ error: 'Колонка с таким именем уже существует' });
    }

    const oldName = columns[colIndex].name;
    if (newName) columns[colIndex].name = newName;
    if (newType) columns[colIndex].type = newType;

    let rows = table.rows || [];
    if (newName && newName !== oldName) {
      rows = rows.map(row => {
        const newRow = { ...row };
        if (oldName in newRow) {
          newRow[newName] = newRow[oldName];
          delete newRow[oldName];
        }
        return newRow;
      });
    }

    const [updated] = await db.update(schema.tables)
      .set({ columns, rows })
      .where(eq(schema.tables.id, tableId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Update column error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/projects/:projectId/tables/:tableId/columns/:columnName', validateAdminToken, async (req, res) => {
  try {
    const { projectId, tableId, columnName } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.id, tableId)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    const columns = table.columns || [];
    const colIndex = columns.findIndex(c => c.name === columnName);
    if (colIndex === -1) {
      return res.status(404).json({ error: 'Колонка не найдена' });
    }

    if (columns[colIndex].primary) {
      return res.status(400).json({ error: 'Нельзя удалить первичный ключ' });
    }

    columns.splice(colIndex, 1);

    let rows = table.rows || [];
    rows = rows.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });

    const [updated] = await db.update(schema.tables)
      .set({ columns, rows })
      .where(eq(schema.tables.id, tableId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/admin/projects/:projectId/tables/:tableId/rows', validateAdminToken, async (req, res) => {
  try {
    const { projectId, tableId } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.id, tableId)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    res.json(table.rows || []);
  } catch (error) {
    console.error('Get rows error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/admin/projects/:projectId/tables/:tableId/rows', validateAdminToken, async (req, res) => {
  try {
    const { projectId, tableId } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.id, tableId)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    const newRow = { id: uuidv4(), ...req.body };
    const rows = [...(table.rows || []), newRow];

    await db.update(schema.tables)
      .set({ rows })
      .where(eq(schema.tables.id, table.id));

    res.json(newRow);
  } catch (error) {
    console.error('Insert row error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/admin/projects/:projectId/tables/:tableId/rows/:rowId', validateAdminToken, async (req, res) => {
  try {
    const { projectId, tableId, rowId } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.id, tableId)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    let rows = table.rows || [];
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    rows[rowIndex] = { ...rows[rowIndex], ...req.body };

    await db.update(schema.tables)
      .set({ rows })
      .where(eq(schema.tables.id, table.id));

    res.json(rows[rowIndex]);
  } catch (error) {
    console.error('Update row error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/projects/:projectId/tables/:tableId/rows/:rowId', validateAdminToken, async (req, res) => {
  try {
    const { projectId, tableId, rowId } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.id, tableId)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    let rows = table.rows || [];
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    rows.splice(rowIndex, 1);

    await db.update(schema.tables)
      .set({ rows })
      .where(eq(schema.tables.id, table.id));

    res.json({ success: true });
  } catch (error) {
    console.error('Delete row error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/projects/:projectId/:tableName', validateApiKey, async (req, res) => {
  try {
    const { projectId, tableName } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.name, tableName)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    res.json(table.rows || []);
  } catch (error) {
    console.error('Get table data error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/projects/:projectId/:tableName', validateApiKey, async (req, res) => {
  try {
    const { projectId, tableName } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.name, tableName)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    const newRow = { id: uuidv4(), ...req.body };
    const rows = [...(table.rows || []), newRow];

    await db.update(schema.tables)
      .set({ rows })
      .where(eq(schema.tables.id, table.id));

    res.json(newRow);
  } catch (error) {
    console.error('Insert row error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/projects/:projectId/:tableName/:rowId', validateApiKey, async (req, res) => {
  try {
    const { projectId, tableName, rowId } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.name, tableName)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    let rows = table.rows || [];
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    rows[rowIndex] = { ...rows[rowIndex], ...req.body };

    await db.update(schema.tables)
      .set({ rows })
      .where(eq(schema.tables.id, table.id));

    res.json(rows[rowIndex]);
  } catch (error) {
    console.error('Update row error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/projects/:projectId/:tableName/:rowId', validateApiKey, async (req, res) => {
  try {
    const { projectId, tableName, rowId } = req.params;

    const [table] = await db.select().from(schema.tables)
      .where(and(eq(schema.tables.projectId, projectId), eq(schema.tables.name, tableName)));
    
    if (!table) {
      return res.status(404).json({ error: 'Таблица не найдена' });
    }

    let rows = table.rows || [];
    const rowIndex = rows.findIndex(r => r.id === rowId);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    rows.splice(rowIndex, 1);

    await db.update(schema.tables)
      .set({ rows })
      .where(eq(schema.tables.id, table.id));

    res.json({ success: true });
  } catch (error) {
    console.error('Delete row error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/admin/projects/:projectId/auth/users', validateAdminToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    const users = await db.select({
      id: schema.authUsers.id,
      email: schema.authUsers.email,
      created_at: schema.authUsers.createdAt,
    }).from(schema.authUsers).where(eq(schema.authUsers.projectId, projectId));

    res.json(users);
  } catch (error) {
    console.error('Get auth users error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/admin/projects/:projectId/auth/users', validateAdminToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, password } = req.body;

    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const existing = await db.select().from(schema.authUsers)
      .where(and(eq(schema.authUsers.projectId, projectId), eq(schema.authUsers.email, email)));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const [user] = await db.insert(schema.authUsers).values({
      projectId,
      email,
      password,
    }).returning();

    res.json({ id: user.id, email: user.email, created_at: user.createdAt });
  } catch (error) {
    console.error('Create auth user error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/projects/:projectId/auth/users/:userId', validateAdminToken, async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const [user] = await db.select().from(schema.authUsers)
      .where(and(eq(schema.authUsers.projectId, projectId), eq(schema.authUsers.id, userId)));
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await db.delete(schema.authUsers).where(eq(schema.authUsers.id, userId));
    res.json({ success: true });
  } catch (error) {
    console.error('Delete auth user error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/projects/:projectId/auth/signup', validateApiKey, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, password } = req.body;

    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const existing = await db.select().from(schema.authUsers)
      .where(and(eq(schema.authUsers.projectId, projectId), eq(schema.authUsers.email, email)));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const [user] = await db.insert(schema.authUsers).values({
      projectId,
      email,
      password,
    }).returning();

    res.json({ user: { id: user.id, email: user.email }, token: uuidv4() });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/projects/:projectId/auth/login', validateApiKey, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email, password } = req.body;

    const [user] = await db.select().from(schema.authUsers)
      .where(and(
        eq(schema.authUsers.projectId, projectId),
        eq(schema.authUsers.email, email),
        eq(schema.authUsers.password, password)
      ));
    
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    res.json({ user: { id: user.id, email: user.email }, token: uuidv4() });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/admin/projects/:projectId/storage/buckets', validateAdminToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    const bucketsList = await db.select().from(schema.buckets).where(eq(schema.buckets.projectId, projectId));
    res.json(bucketsList);
  } catch (error) {
    console.error('Get buckets error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/admin/projects/:projectId/storage/buckets', validateAdminToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, public: isPublic } = req.body;

    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Название bucket обязательно' });
    }

    const existing = await db.select().from(schema.buckets)
      .where(and(eq(schema.buckets.projectId, projectId), eq(schema.buckets.name, name)));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Bucket с таким именем уже существует' });
    }

    const [bucket] = await db.insert(schema.buckets).values({
      projectId,
      name,
      public: isPublic || false,
    }).returning();

    res.json(bucket);
  } catch (error) {
    console.error('Create bucket error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/admin/projects/:projectId/storage/buckets/:bucketName', validateAdminToken, async (req, res) => {
  try {
    const { projectId, bucketName } = req.params;

    const [bucket] = await db.select().from(schema.buckets)
      .where(and(eq(schema.buckets.projectId, projectId), eq(schema.buckets.name, bucketName)));
    
    if (!bucket) {
      return res.status(404).json({ error: 'Bucket не найден' });
    }

    await db.delete(schema.files).where(eq(schema.files.bucketId, bucket.id));
    await db.delete(schema.buckets).where(eq(schema.buckets.id, bucket.id));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete bucket error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/admin/projects/:projectId/storage/buckets/:bucketName/files', validateAdminToken, async (req, res) => {
  try {
    const { projectId, bucketName } = req.params;

    const [bucket] = await db.select().from(schema.buckets)
      .where(and(eq(schema.buckets.projectId, projectId), eq(schema.buckets.name, bucketName)));
    
    if (!bucket) {
      return res.status(404).json({ error: 'Bucket не найден' });
    }

    const filesList = await db.select().from(schema.files).where(eq(schema.files.bucketId, bucket.id));
    res.json(filesList);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Server running on http://0.0.0.0:${PORT}`);
  });
}
