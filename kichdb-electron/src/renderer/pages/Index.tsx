import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiUrl } from '@/lib/api'
import {
  Database,
  Plus,
  Trash2,
  Key,
  Copy,
  Eye,
  EyeOff,
  FolderOpen,
  Users,
  TableIcon,
  LogOut,
  HardDrive,
  Pencil,
  Check,
  X,
  ChevronRight,
  Lock
} from 'lucide-react'

interface Project {
  id: string
  name: string
  created: string
  url: string
  status: string
  apiKeys?: { anon: string; service: string }
}

interface TableData {
  id: string
  name: string
  columns: { name: string; type: string; primary?: boolean }[]
  rows: Record<string, unknown>[]
}

interface ApiKeys {
  anon: string
  service: string
}

interface AuthUser {
  id: string
  email: string
  created_at: string
}

interface StorageBucket {
  id: string
  name: string
  public: boolean
  created_at: string
}

interface StorageFile {
  id: string
  name: string
  path: string
  size: number
  mime_type: string
}

export default function Index() {
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [tables, setTables] = useState<TableData[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tables' | 'storage' | 'auth' | 'api'>('dashboard')
  const [loading, setLoading] = useState(false)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([])
  const [buckets, setBuckets] = useState<StorageBucket[]>([])
  const [selectedBucket, setSelectedBucket] = useState<StorageBucket | null>(null)
  const [bucketFiles, setBucketFiles] = useState<StorageFile[]>([])

  const [newProjectName, setNewProjectName] = useState('')
  const [newTableName, setNewTableName] = useState('')
  const [newBucketName, setNewBucketName] = useState('')
  const [newBucketPublic, setNewBucketPublic] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState('text')
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editColumnName, setEditColumnName] = useState('')
  const [editColumnType, setEditColumnType] = useState('')

  const [newRowData, setNewRowData] = useState<Record<string, string>>({})
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editRowData, setEditRowData] = useState<Record<string, unknown>>({})

  useEffect(() => {
    const savedToken = localStorage.getItem("adminToken");
    if (savedToken) {
      verifyToken(savedToken);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(apiUrl('/auth/verify'), {
        headers: { 'X-Admin-Token': token }
      });
      if (response.ok) {
        setAdminToken(token);
        loadProjects(token);
      } else {
        localStorage.removeItem("adminToken");
      }
    } catch {
      localStorage.removeItem("adminToken");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAuthError(data.error || 'Неверный пароль')
        return;
      }

      if (data.token) {
        localStorage.setItem("adminToken", data.token);
        setAdminToken(data.token);
        loadProjects(data.token);
      } else {
        setAuthError("Ошибка авторизации");
      }
    } catch {
      setAuthError('Ошибка подключения к серверу')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(apiUrl('/auth/logout'), {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken || '' }
      });
    } catch {}
    
    localStorage.removeItem('adminToken')
    setAdminToken(null)
    setProjects([])
    setCurrentProject(null)
    setPassword('')
  }

  const loadProjects = async (token?: string) => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/admin/projects'), {
        headers: { 'X-Admin-Token': token || adminToken || '' }
      })
      const contentType = response.headers.get('content-type')
      if (!response.ok || !contentType?.includes('application/json')) {
        console.error('Error loading projects: Invalid response')
        setProjects([])
        return
      }
      const data = await response.json()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim()) return
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/admin/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken || ''
        },
        body: JSON.stringify({ name: newProjectName }),
      })
      const data = await response.json()
      setProjects([...projects, { ...data.project, apiKeys: data.apiKeys }])
      setNewProjectName('')
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) return
    try {
      await fetch(apiUrl(`/admin/projects/${projectId}`), {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      setProjects(projects.filter(p => p.id !== projectId))
      if (currentProject?.id === projectId) {
        setCurrentProject(null)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  const selectProject = async (project: Project) => {
    setCurrentProject(project)
    setApiKeys(project.apiKeys || null)
    setActiveTab('dashboard')
    await loadTables(project.id)
    await loadAuthUsers(project.id)
    await loadBuckets(project.id)
  }

  const loadTables = async (projectId: string) => {
    try {
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/tables`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      const contentType = response.headers.get('content-type')
      if (!response.ok || !contentType?.includes('application/json')) {
        console.error('Error loading tables: Invalid response')
        setTables([])
        return
      }
      const data = await response.json()
      setTables(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading tables:', error)
      setTables([])
    }
  }

  const createTable = async () => {
    if (!newTableName.trim() || !currentProject) return
    try {
      setLoading(true)
      const response = await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken || ''
        },
        body: JSON.stringify({ name: newTableName }),
      })
      const data = await response.json()
      setTables([...tables, data])
      setNewTableName('')
    } catch (error) {
      console.error('Error creating table:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTable = async (tableName: string) => {
    if (!currentProject) return
    if (!confirm('Вы уверены, что хотите удалить эту таблицу?')) return
    try {
      await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables/${tableName}`), {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      setTables(tables.filter(t => t.name !== tableName))
      if (selectedTable?.name === tableName) {
        setSelectedTable(null)
      }
    } catch (error) {
      console.error('Error deleting table:', error)
    }
  }

  const addColumn = async () => {
    if (!newColumnName.trim() || !currentProject || !selectedTable) return
    try {
      await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables/${selectedTable.id}/columns`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken || ''
        },
        body: JSON.stringify({ name: newColumnName, type: newColumnType }),
      })
      await loadTables(currentProject.id)
      const updatedTables = await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      }).then(r => r.json())
      const updated = updatedTables.find((t: TableData) => t.id === selectedTable.id)
      if (updated) setSelectedTable(updated)
      setNewColumnName('')
    } catch (error) {
      console.error('Error adding column:', error)
    }
  }

  const updateColumn = async (columnName: string) => {
    if (!currentProject || !selectedTable) return
    try {
      await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables/${selectedTable.id}/columns/${columnName}`), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken || ''
        },
        body: JSON.stringify({ 
          newName: editColumnName !== columnName ? editColumnName : undefined,
          newType: editColumnType 
        }),
      })
      await loadTables(currentProject.id)
      const updatedTables = await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      }).then(r => r.json())
      const updated = updatedTables.find((t: TableData) => t.id === selectedTable.id)
      if (updated) setSelectedTable(updated)
      setEditingColumn(null)
    } catch (error) {
      console.error('Error updating column:', error)
    }
  }

  const deleteColumn = async (columnName: string) => {
    if (!currentProject || !selectedTable) return
    if (!confirm(`Удалить колонку "${columnName}"? Данные в этой колонке будут потеряны.`)) return
    try {
      await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables/${selectedTable.id}/columns/${columnName}`), {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      await loadTables(currentProject.id)
      const updatedTables = await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      }).then(r => r.json())
      const updated = updatedTables.find((t: TableData) => t.id === selectedTable.id)
      if (updated) setSelectedTable(updated)
    } catch (error) {
      console.error('Error deleting column:', error)
    }
  }

  const startEditColumn = (col: { name: string; type: string }) => {
    setEditingColumn(col.name)
    setEditColumnName(col.name)
    setEditColumnType(col.type)
  }

  const addRow = async () => {
    if (!currentProject || !selectedTable) return
    try {
      const response = await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables/${selectedTable.id}/rows`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken || ''
        },
        body: JSON.stringify(newRowData),
      })
      const newRow = await response.json()
      const updatedTable = { ...selectedTable, rows: [...selectedTable.rows, newRow] }
      setSelectedTable(updatedTable)
      setTables(tables.map(t => t.id === selectedTable.id ? updatedTable : t))
      setNewRowData({})
    } catch (error) {
      console.error('Error adding row:', error)
    }
  }

  const updateRow = async (rowId: string) => {
    if (!currentProject || !selectedTable) return
    try {
      await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables/${selectedTable.id}/rows/${rowId}`), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken || ''
        },
        body: JSON.stringify(editRowData),
      })
      const updatedRows = selectedTable.rows.map(r => 
        (r as Record<string, unknown>).id === rowId ? { ...r, ...editRowData } : r
      )
      const updatedTable = { ...selectedTable, rows: updatedRows }
      setSelectedTable(updatedTable)
      setTables(tables.map(t => t.id === selectedTable.id ? updatedTable : t))
      setEditingRow(null)
      setEditRowData({})
    } catch (error) {
      console.error('Error updating row:', error)
    }
  }

  const deleteRow = async (rowId: string) => {
    if (!currentProject || !selectedTable) return
    if (!confirm('Удалить эту запись?')) return
    try {
      await fetch(apiUrl(`/admin/projects/${currentProject.id}/tables/${selectedTable.id}/rows/${rowId}`), {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      const updatedRows = selectedTable.rows.filter(r => (r as Record<string, unknown>).id !== rowId)
      const updatedTable = { ...selectedTable, rows: updatedRows }
      setSelectedTable(updatedTable)
      setTables(tables.map(t => t.id === selectedTable.id ? updatedTable : t))
    } catch (error) {
      console.error('Error deleting row:', error)
    }
  }

  const loadAuthUsers = async (projectId: string) => {
    try {
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/auth/users`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      const contentType = response.headers.get('content-type')
      if (!response.ok || !contentType?.includes('application/json')) {
        console.error('Error loading auth users: Invalid response')
        setAuthUsers([])
        return
      }
      const data = await response.json()
      setAuthUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading auth users:', error)
      setAuthUsers([])
    }
  }

  const deleteAuthUser = async (userId: string) => {
    if (!currentProject) return
    if (!confirm('Удалить этого пользователя?')) return
    try {
      await fetch(apiUrl(`/admin/projects/${currentProject.id}/auth/users/${userId}`), {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      setAuthUsers(authUsers.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const loadBuckets = async (projectId: string) => {
    try {
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/storage/buckets`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      const contentType = response.headers.get('content-type')
      if (!response.ok || !contentType?.includes('application/json')) {
        console.error('Error loading buckets: Invalid response')
        setBuckets([])
        return
      }
      const data = await response.json()
      setBuckets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading buckets:', error)
      setBuckets([])
    }
  }

  const createBucket = async () => {
    if (!newBucketName.trim() || !currentProject) return
    try {
      setLoading(true)
      const response = await fetch(apiUrl(`/admin/projects/${currentProject.id}/storage/buckets`), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken || ''
        },
        body: JSON.stringify({ name: newBucketName, public: newBucketPublic }),
      })
      const data = await response.json()
      setBuckets([...buckets, data])
      setNewBucketName('')
      setNewBucketPublic(false)
    } catch (error) {
      console.error('Error creating bucket:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteBucket = async (bucketName: string) => {
    if (!currentProject) return
    if (!confirm('Удалить этот bucket и все файлы в нём?')) return
    try {
      await fetch(apiUrl(`/admin/projects/${currentProject.id}/storage/buckets/${bucketName}`), {
        method: 'DELETE',
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      setBuckets(buckets.filter(b => b.name !== bucketName))
      if (selectedBucket?.name === bucketName) {
        setSelectedBucket(null)
        setBucketFiles([])
      }
    } catch (error) {
      console.error('Error deleting bucket:', error)
    }
  }

  const loadBucketFiles = async (bucket: StorageBucket) => {
    if (!currentProject) return
    setSelectedBucket(bucket)
    try {
      const response = await fetch(apiUrl(`/admin/projects/${currentProject.id}/storage/buckets/${bucket.name}/files`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      const contentType = response.headers.get('content-type')
      if (!response.ok || !contentType?.includes('application/json')) {
        console.error('Error loading files: Invalid response')
        setBucketFiles([])
        return
      }
      const data = await response.json()
      setBucketFiles(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading files:', error)
      setBucketFiles([])
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Lock className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">KICH DB</CardTitle>
            <CardDescription>
              Введите пароль для доступа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? 'Проверка...' : 'Войти'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">KICH DB</h1>
                <p className="text-sm text-muted-foreground">Панель управления базой данных</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Создать проект</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Название проекта"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                />
                <Button onClick={createProject} disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteProject(project.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <CardDescription>
                    Создан: {project.created ? new Date(project.created).toLocaleDateString('ru-RU') : 'Неизвестно'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{project.status}</Badge>
                    <Button size="sm" onClick={() => selectProject(project)}>
                      Открыть
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {projects.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Нет проектов. Создайте первый проект!</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentProject(null)}>
              <Database className="w-4 h-4 mr-2" />
              Все проекты
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{currentProject.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r min-h-[calc(100vh-73px)] bg-card p-4">
          <nav className="space-y-2">
            <Button
              variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('dashboard')}
            >
              <HardDrive className="w-4 h-4 mr-2" />
              Обзор
            </Button>
            <Button
              variant={activeTab === 'tables' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('tables')}
            >
              <TableIcon className="w-4 h-4 mr-2" />
              Таблицы
            </Button>
            <Button
              variant={activeTab === 'storage' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('storage')}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Хранилище
            </Button>
            <Button
              variant={activeTab === 'auth' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('auth')}
            >
              <Users className="w-4 h-4 mr-2" />
              Пользователи
            </Button>
            <Button
              variant={activeTab === 'api' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('api')}
            >
              <Key className="w-4 h-4 mr-2" />
              API Ключи
            </Button>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Обзор проекта</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Таблицы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tables.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Пользователи</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{authUsers.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Buckets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{buckets.length}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Таблицы</h2>
              </div>

              {!selectedTable ? (
                <>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Название таблицы"
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && createTable()}
                        />
                        <Button onClick={createTable} disabled={loading}>
                          <Plus className="w-4 h-4 mr-2" />
                          Создать
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4">
                    {tables.map((table) => (
                      <Card key={table.id} className="cursor-pointer hover:border-primary/50" onClick={() => setSelectedTable(table)}>
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TableIcon className="w-5 h-5 text-muted-foreground" />
                              <CardTitle className="text-lg">{table.name}</CardTitle>
                              <Badge variant="outline">{table.columns.length} колонок</Badge>
                              <Badge variant="secondary">{table.rows.length} записей</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteTable(table.name)
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setSelectedTable(null)}>
                      ← Назад
                    </Button>
                    <h3 className="text-xl font-semibold">{selectedTable.name}</h3>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Колонки</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4">
                        <Input
                          placeholder="Название колонки"
                          value={newColumnName}
                          onChange={(e) => setNewColumnName(e.target.value)}
                        />
                        <select
                          className="px-3 py-2 border rounded-md bg-background"
                          value={newColumnType}
                          onChange={(e) => setNewColumnType(e.target.value)}
                        >
                          <option value="text">Text</option>
                          <option value="integer">Integer</option>
                          <option value="boolean">Boolean</option>
                          <option value="uuid">UUID</option>
                          <option value="timestamp">Timestamp</option>
                          <option value="json">JSON</option>
                        </select>
                        <Button onClick={addColumn}>
                          <Plus className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Название</TableHead>
                            <TableHead>Тип</TableHead>
                            <TableHead className="w-24">Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedTable.columns.map((col) => (
                            <TableRow key={col.name}>
                              <TableCell>
                                {editingColumn === col.name ? (
                                  <Input
                                    value={editColumnName}
                                    onChange={(e) => setEditColumnName(e.target.value)}
                                    disabled={col.primary}
                                  />
                                ) : (
                                  <span className="flex items-center gap-2">
                                    {col.name}
                                    {col.primary && <Badge>PK</Badge>}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingColumn === col.name ? (
                                  <select
                                    className="px-2 py-1 border rounded bg-background"
                                    value={editColumnType}
                                    onChange={(e) => setEditColumnType(e.target.value)}
                                    disabled={col.primary}
                                  >
                                    <option value="text">Text</option>
                                    <option value="integer">Integer</option>
                                    <option value="boolean">Boolean</option>
                                    <option value="uuid">UUID</option>
                                    <option value="timestamp">Timestamp</option>
                                    <option value="json">JSON</option>
                                  </select>
                                ) : (
                                  col.type
                                )}
                              </TableCell>
                              <TableCell>
                                {!col.primary && (
                                  editingColumn === col.name ? (
                                    <div className="flex gap-1">
                                      <Button size="icon" variant="ghost" onClick={() => updateColumn(col.name)}>
                                        <Check className="w-4 h-4" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => setEditingColumn(null)}>
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Button size="icon" variant="ghost" onClick={() => startEditColumn(col)}>
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => deleteColumn(col.name)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Данные</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {selectedTable.columns.filter(c => !c.primary).map((col) => (
                          <Input
                            key={col.name}
                            placeholder={col.name}
                            value={newRowData[col.name] || ''}
                            onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                            className="w-40"
                          />
                        ))}
                        <Button onClick={addRow}>
                          <Plus className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {selectedTable.columns.map((col) => (
                                <TableHead key={col.name}>{col.name}</TableHead>
                              ))}
                              <TableHead className="w-24">Действия</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedTable.rows.map((row) => {
                              const rowData = row as Record<string, unknown>
                              return (
                                <TableRow key={rowData.id as string}>
                                  {selectedTable.columns.map((col) => (
                                    <TableCell key={col.name}>
                                      {editingRow === rowData.id ? (
                                        col.primary ? (
                                          String(rowData[col.name] ?? '')
                                        ) : (
                                          <Input
                                            value={String(editRowData[col.name] ?? '')}
                                            onChange={(e) => setEditRowData({ ...editRowData, [col.name]: e.target.value })}
                                            className="w-32"
                                          />
                                        )
                                      ) : (
                                        String(rowData[col.name] ?? '')
                                      )}
                                    </TableCell>
                                  ))}
                                  <TableCell>
                                    {editingRow === rowData.id ? (
                                      <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => updateRow(rowData.id as string)}>
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => { setEditingRow(null); setEditRowData({}); }}>
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => { setEditingRow(rowData.id as string); setEditRowData(rowData); }}>
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => deleteRow(rowData.id as string)}>
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Хранилище</h2>
              
              {!selectedBucket ? (
                <>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Название bucket"
                          value={newBucketName}
                          onChange={(e) => setNewBucketName(e.target.value)}
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newBucketPublic}
                            onChange={(e) => setNewBucketPublic(e.target.checked)}
                          />
                          Публичный
                        </label>
                        <Button onClick={createBucket} disabled={loading}>
                          <Plus className="w-4 h-4 mr-2" />
                          Создать
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4">
                    {buckets.map((bucket) => (
                      <Card key={bucket.id} className="cursor-pointer hover:border-primary/50" onClick={() => loadBucketFiles(bucket)}>
                        <CardHeader className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="w-5 h-5 text-muted-foreground" />
                              <CardTitle className="text-lg">{bucket.name}</CardTitle>
                              {bucket.public && <Badge>Публичный</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteBucket(bucket.name)
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => { setSelectedBucket(null); setBucketFiles([]); }}>
                      ← Назад
                    </Button>
                    <h3 className="text-xl font-semibold">{selectedBucket.name}</h3>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Файлы</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bucketFiles.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">Нет файлов в этом bucket</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Имя</TableHead>
                              <TableHead>Путь</TableHead>
                              <TableHead>Размер</TableHead>
                              <TableHead>Тип</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bucketFiles.map((file) => (
                              <TableRow key={file.id}>
                                <TableCell>{file.name}</TableCell>
                                <TableCell>{file.path}</TableCell>
                                <TableCell>{file.size} bytes</TableCell>
                                <TableCell>{file.mime_type}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Пользователи проекта</h2>
              <Card>
                <CardContent className="pt-6">
                  {authUsers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Нет пользователей</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Создан</TableHead>
                          <TableHead className="w-24">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {authUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{new Date(user.created_at).toLocaleDateString('ru-RU')}</TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => deleteAuthUser(user.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'api' && apiKeys && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">API Ключи</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Ключи доступа к проекту</CardTitle>
                  <CardDescription>
                    Используйте эти ключи для подключения внешних приложений к вашей базе данных
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project URL</label>
                    <div className="flex gap-2">
                      <Input value={currentProject.url || ''} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(currentProject.url || '', 'url')}>
                        {copied === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Anon Key (публичный)</label>
                    <div className="flex gap-2">
                      <Input 
                        value={showApiKey['anon'] ? apiKeys.anon : '••••••••••••••••••••'} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setShowApiKey({ ...showApiKey, anon: !showApiKey['anon'] })}
                      >
                        {showApiKey['anon'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKeys.anon, 'anon')}>
                        {copied === 'anon' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Используйте для клиентских приложений</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Service Key (приватный)</label>
                    <div className="flex gap-2">
                      <Input 
                        value={showApiKey['service'] ? apiKeys.service : '••••••••••••••••••••'} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setShowApiKey({ ...showApiKey, service: !showApiKey['service'] })}
                      >
                        {showApiKey['service'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKeys.service, 'service')}>
                        {copied === 'service' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Используйте только на сервере. Никогда не делитесь этим ключом!</p>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">Пример использования</h4>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// JavaScript/TypeScript
const response = await fetch('${currentProject.url}/tableName', {
  headers: {
    'apikey': 'YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  }
});
const data = await response.json();

// Добавить запись
await fetch('${currentProject.url}/tableName', {
  method: 'POST',
  headers: {
    'apikey': 'YOUR_ANON_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ field: 'value' })
});`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
