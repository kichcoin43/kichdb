import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiUrl, getApiUrl } from '@/lib/api'
import { RealtimeClient } from '@/lib/realtime'
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
  Settings,
  HardDrive
} from 'lucide-react'

interface Machine {
  id: string
  name: string
}

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
  const [machine, setMachine] = useState<Machine | null>(null)
  const [machineToken, setMachineToken] = useState<string | null>(null)
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login')
  const [machineName, setMachineName] = useState('')
  const [machinePassword, setMachinePassword] = useState('')
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

  // Load machine from localStorage on startup
  useEffect(() => {
    const savedToken = localStorage.getItem("machineToken");
    const savedMachine = localStorage.getItem("machine");
    if (savedToken && savedMachine && savedMachine !== "undefined") {
      try {
        setMachineToken(savedToken);
        setMachine(JSON.parse(savedMachine));
      } catch (error) {
        console.error("Failed to parse saved machine data:", error);
        localStorage.removeItem("machineToken");
        localStorage.removeItem("machine");
      }
    }
  }, []);

  useEffect(() => {
    if (machineToken) {
      loadProjects()
    }
  }, [machineToken])

  const handleMachineAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      const endpoint = loginMode === 'login' ? apiUrl('/machines/login') : apiUrl('/machines/register')
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: machineName, password: machinePassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAuthError(data.error || 'Ошибка авторизации')
        return;
      }

      if (data.token && data.machine) {
        localStorage.setItem("machineToken", data.token);
        localStorage.setItem("machine", JSON.stringify(data.machine));
        setMachineToken(data.token);
        setMachine(data.machine);
      } else {
        setAuthError("Некорректный ответ сервера");
      }
    } catch {
      setAuthError('Ошибка подключения к серверу')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('machineToken')
    localStorage.removeItem('machine')
    setMachineToken(null)
    setMachine(null)
    setProjects([])
    setCurrentProject(null)
  }

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl('/admin/projects'), {
        headers: { 'X-Machine-Id': machineToken || '' }
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
          'X-Machine-Id': machineToken || ''
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
        headers: { 'X-Machine-Id': machineToken || '' }
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
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/tables`))
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColumnName, type: newColumnType }),
      })
      await loadTables(currentProject.id)
      setNewColumnName('')
    } catch (error) {
      console.error('Error adding column:', error)
    }
  }

  const loadAuthUsers = async (projectId: string) => {
    try {
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/auth/users`))
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
      })
      setAuthUsers(authUsers.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const loadBuckets = async (projectId: string) => {
    try {
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/storage/buckets`))
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
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(apiUrl(`/admin/projects/${currentProject.id}/storage/buckets/${bucket.name}/files`))
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

  if (!machineToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Database className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">KICH DB</CardTitle>
            <CardDescription>
              {loginMode === 'login' ? 'Войдите в систему' : 'Создайте аккаунт'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMachineAuth} className="space-y-4">
              <div>
                <Input
                  placeholder="Имя пользователя"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Пароль"
                  value={machinePassword}
                  onChange={(e) => setMachinePassword(e.target.value)}
                  required
                />
              </div>
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? 'Загрузка...' : loginMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {loginMode === 'login' ? (
                  <>
                    Нет аккаунта?{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setLoginMode('register')}
                    >
                      Зарегистрироваться
                    </button>
                  </>
                ) : (
                  <>
                    Уже есть аккаунт?{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setLoginMode('login')}
                    >
                      Войти
                    </button>
                  </>
                )}
              </p>
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
                <p className="text-sm text-muted-foreground">Добро пожаловать, {machine?.name}</p>
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
            <span className="text-sm text-muted-foreground">{machine?.name}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r bg-card min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-2">
            {[
              { id: 'dashboard', icon: Settings, label: 'Обзор' },
              { id: 'tables', icon: TableIcon, label: 'Таблицы' },
              { id: 'storage', icon: FolderOpen, label: 'Хранилище' },
              { id: 'auth', icon: Users, label: 'Пользователи' },
              { id: 'api', icon: Key, label: 'API Ключи' },
            ].map((item) => (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setActiveTab(item.id as any)}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Обзор проекта</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Таблицы</CardDescription>
                    <CardTitle className="text-3xl">{tables.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Пользователи Auth</CardDescription>
                    <CardTitle className="text-3xl">{authUsers.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Buckets</CardDescription>
                    <CardTitle className="text-3xl">{buckets.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Таблицы</h2>
                <div className="flex gap-2">
                  <Input
                    placeholder="Название таблицы"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="w-48"
                  />
                  <Button onClick={createTable} disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {tables.map((table) => (
                  <Card key={table.id} className={selectedTable?.id === table.id ? 'border-primary' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TableIcon className="w-4 h-4" />
                          {table.name}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedTable(table)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteTable(table.name)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {table.columns.map((col) => (
                          <Badge key={col.name} variant="outline" className="text-xs">
                            {col.name}: {col.type}
                            {col.primary && ' (PK)'}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {table.rows.length} записей
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedTable && (
                <Card>
                  <CardHeader>
                    <CardTitle>Добавить колонку в {selectedTable.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
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
                        <option value="text">text</option>
                        <option value="int">int</option>
                        <option value="boolean">boolean</option>
                        <option value="timestamp">timestamp</option>
                        <option value="uuid">uuid</option>
                        <option value="json">json</option>
                      </select>
                      <Button onClick={addColumn}>Добавить</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {tables.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <TableIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет таблиц. Создайте первую таблицу!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Хранилище</h2>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Название bucket"
                    value={newBucketName}
                    onChange={(e) => setNewBucketName(e.target.value)}
                    className="w-48"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newBucketPublic}
                      onChange={(e) => setNewBucketPublic(e.target.checked)}
                    />
                    Public
                  </label>
                  <Button onClick={createBucket} disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {buckets.map((bucket) => (
                  <Card key={bucket.id} className={selectedBucket?.id === bucket.id ? 'border-primary' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          {bucket.name}
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => loadBucketFiles(bucket)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteBucket(bucket.name)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={bucket.public ? 'default' : 'secondary'}>
                        {bucket.public ? 'Public' : 'Private'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedBucket && (
                <Card>
                  <CardHeader>
                    <CardTitle>Файлы в {selectedBucket.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {bucketFiles.length > 0 ? (
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
                              <TableCell className="font-mono text-xs">{file.path}</TableCell>
                              <TableCell>{(file.size / 1024).toFixed(2)} KB</TableCell>
                              <TableCell>{file.mime_type}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground">Нет файлов</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {buckets.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет buckets. Создайте первый bucket!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'auth' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Пользователи</h2>

              {authUsers.length > 0 ? (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Создан</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {authUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="font-mono text-xs">{user.id}</TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => deleteAuthUser(user.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет пользователей</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'api' && apiKeys && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">API Ключи</h2>

              <div className="space-y-4">
                {[
                  { key: 'anon', label: 'Anon Key', description: 'Публичный ключ для клиентского использования' },
                  { key: 'service', label: 'Service Key', description: 'Приватный ключ с полным доступом' },
                ].map((item) => (
                  <Card key={item.key}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        {item.label}
                      </CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showApiKey[item.key] ? 'text' : 'password'}
                          value={apiKeys[item.key as keyof ApiKeys]}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setShowApiKey({ ...showApiKey, [item.key]: !showApiKey[item.key] })
                          }
                        >
                          {showApiKey[item.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(apiKeys[item.key as keyof ApiKeys], item.key)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {copied === item.key && (
                          <span className="text-sm text-green-500">Скопировано!</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Примеры использования API</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Получить данные из таблицы:</p>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`fetch('/api/projects/${currentProject.id}/TABLE_NAME?select=*', {
  headers: { 'apikey': '${apiKeys.anon}' }
})`}
                    </pre>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Добавить запись:</p>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`fetch('/api/projects/${currentProject.id}/TABLE_NAME', {
  method: 'POST',
  headers: {
    'apikey': '${apiKeys.anon}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ field: 'value' })
})`}
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