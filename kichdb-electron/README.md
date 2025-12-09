# KICH DB - Desktop Database Manager

Локальная система управления базами данных с функциональностью, аналогичной Supabase.

## Быстрый старт

### Разработка

```bash
# Установить зависимости
npm install

# Запустить в режиме разработки
npm run dev
```

### Сборка EXE

```bash
# Полная сборка и создание дистрибутива
npm run dist:win
```

После сборки в папке `release` появятся:
- `KICHDB-1.0.0-portable.exe` - портативная версия (не требует установки)
- `KICHDB Setup 1.0.0.exe` - установщик

## Функции

### Управление проектами
- Создание, удаление проектов
- Изоляция данных между проектами
- API ключи (anon и service) для каждого проекта

### Таблицы
- Создание таблиц с типизированными колонками
- CRUD операции через REST API
- Поддержка типов: text, int, boolean, timestamp, uuid, json

### Аутентификация
- Регистрация и вход пользователей
- Управление сессиями
- JWT-подобные токены

### Хранилище файлов
- Создание публичных и приватных buckets
- Загрузка и скачивание файлов
- Управление файлами

### Real-time
- WebSocket подключения
- Подписка на изменения таблиц
- Автоматическая синхронизация данных

## API Примеры

### Получить данные
```javascript
fetch('/api/projects/{projectId}/{tableName}?select=*', {
  headers: { 'apikey': 'pk_anon_...' }
})
```

### Добавить запись
```javascript
fetch('/api/projects/{projectId}/{tableName}', {
  method: 'POST',
  headers: { 
    'apikey': 'pk_anon_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ field: 'value' })
})
```

### Обновить запись
```javascript
fetch('/api/projects/{projectId}/{tableName}?eq=id.{id}', {
  method: 'PATCH',
  headers: { 
    'apikey': 'pk_anon_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ field: 'newValue' })
})
```

### Удалить запись
```javascript
fetch('/api/projects/{projectId}/{tableName}?eq=id.{id}', {
  method: 'DELETE',
  headers: { 'apikey': 'pk_anon_...' }
})
```

## Структура данных

Все данные хранятся в файле `database.json` рядом с exe:
- `machines` - аккаунты пользователей
- `projects` - проекты
- `tables` - таблицы с данными
- `auth` - аутентификация внутри проектов
- `storage` - метаданные файлов
- `apiKeys` - API ключи проектов

## Резервное копирование

Для бэкапа сохраните:
1. `database.json` - все данные
2. Папку `storage/` - загруженные файлы
