
const fetch = require('node-fetch');

const API_URL = 'http://127.0.0.1:3030/api';
const PROJECT_ID = 'ebd916a5-ec15-42c4-ab7d-4bea49c74883'; // из database.json
const MACHINE_ID = 'c8505766-3ec7-4830-94dc-ed2c8d01f0c6'; // из database.json
const ANON_KEY = 'pk_anon_dbd72ec68cd34191a2105b08978f1fab';
const SERVICE_KEY = 'sk_service_7195ea0858bd4cabb3ed5765958f584a';

async function createTable(name) {
  const response = await fetch(`${API_URL}/admin/projects/${PROJECT_ID}/tables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-machine-id': MACHINE_ID
    },
    body: JSON.stringify({ name })
  });
  return await response.json();
}

async function addColumn(tableId, name, type) {
  const response = await fetch(`${API_URL}/admin/projects/${PROJECT_ID}/tables/${tableId}/columns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-machine-id': MACHINE_ID
    },
    body: JSON.stringify({ name, type })
  });
  return await response.json();
}

async function addRow(tableName, data) {
  const response = await fetch(`${API_URL}/projects/${PROJECT_ID}/${tableName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY
    },
    body: JSON.stringify(data)
  });
  return await response.json();
}

async function setupMessenger() {
  console.log('🚀 Настройка таблиц для мессенджера...\n');

  // Проверяем существующие таблицы
  console.log('📋 Проверяем существующие таблицы...');
  const existingResponse = await fetch(`${API_URL}/admin/projects/${PROJECT_ID}/tables`, {
    headers: { 'x-machine-id': MACHINE_ID }
  });
  const existingTables = await existingResponse.json();
  console.log('Существующие таблицы:', existingTables.map(t => t.name).join(', '));

  // Если таблицы users, conversations, messages уже есть, пропускаем создание
  const tableNames = existingTables.map(t => t.name);
  
  let usersTable, conversationsTable, messagesTable;

  if (!tableNames.includes('users')) {
    console.log('\n✨ Создаём таблицу users...');
    usersTable = await createTable('users');
    console.log('✅ Таблица users создана:', usersTable.id);

    console.log('📝 Добавляем колонки в users...');
    await addColumn(usersTable.id, 'username', 'text');
    await addColumn(usersTable.id, 'email', 'text');
    await addColumn(usersTable.id, 'avatar_url', 'text');
    await addColumn(usersTable.id, 'created_at', 'timestamp');
    console.log('✅ Колонки добавлены');
  } else {
    usersTable = existingTables.find(t => t.name === 'users');
    console.log('\n✅ Таблица users уже существует');
  }

  if (!tableNames.includes('conversations')) {
    console.log('\n✨ Создаём таблицу conversations...');
    conversationsTable = await createTable('conversations');
    console.log('✅ Таблица conversations создана:', conversationsTable.id);

    console.log('📝 Добавляем колонки в conversations...');
    await addColumn(conversationsTable.id, 'name', 'text');
    await addColumn(conversationsTable.id, 'created_at', 'timestamp');
    console.log('✅ Колонки добавлены');
  } else {
    conversationsTable = existingTables.find(t => t.name === 'conversations');
    console.log('\n✅ Таблица conversations уже существует');
  }

  if (!tableNames.includes('messages')) {
    console.log('\n✨ Создаём таблицу messages...');
    messagesTable = await createTable('messages');
    console.log('✅ Таблица messages создана:', messagesTable.id);

    console.log('📝 Добавляем колонки в messages...');
    await addColumn(messagesTable.id, 'conversation_id', 'uuid');
    await addColumn(messagesTable.id, 'sender_id', 'uuid');
    await addColumn(messagesTable.id, 'content', 'text');
    await addColumn(messagesTable.id, 'created_at', 'timestamp');
    console.log('✅ Колонки добавлены');
  } else {
    messagesTable = existingTables.find(t => t.name === 'messages');
    console.log('\n✅ Таблица messages уже существует');
  }

  console.log('\n📊 Добавляем тестовые данные...');
  
  // Добавляем пользователей
  const user1 = await addRow('users', {
    username: 'alex',
    email: 'alex@test.com',
    avatar_url: 'https://example.com/avatar1.jpg',
    created_at: new Date().toISOString()
  });
  console.log('✅ Пользователь alex создан:', user1.id);

  const user2 = await addRow('users', {
    username: 'maria',
    email: 'maria@test.com',
    avatar_url: 'https://example.com/avatar2.jpg',
    created_at: new Date().toISOString()
  });
  console.log('✅ Пользователь maria создан:', user2.id);

  // Создаём беседу
  const conversation = await addRow('conversations', {
    name: 'General Chat',
    created_at: new Date().toISOString()
  });
  console.log('✅ Беседа создана:', conversation.id);

  // Добавляем сообщения
  const message1 = await addRow('messages', {
    conversation_id: conversation.id,
    sender_id: user1.id,
    content: 'Привет! Как дела?',
    created_at: new Date().toISOString()
  });
  console.log('✅ Сообщение 1 создано:', message1.id);

  const message2 = await addRow('messages', {
    conversation_id: conversation.id,
    sender_id: user2.id,
    content: 'Привет Alex! Отлично, а у тебя?',
    created_at: new Date().toISOString()
  });
  console.log('✅ Сообщение 2 создано:', message2.id);

  console.log('\n🎉 Готово! Структура мессенджера создана и заполнена тестовыми данными');
  console.log('\n📱 Теперь можно открыть Data Browser в вашем приложении');
}

setupMessenger().catch(console.error);
