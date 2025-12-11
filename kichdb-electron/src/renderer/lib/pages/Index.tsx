import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Pencil,
  Check,
  X,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Search,
  Settings,
  Shield,
  Columns,
  Rows,
  Zap,
  Globe
} from 'lucide-react'

const logoImage = '/logo.png'

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
  const [accountId, setAccountId] = useState<string | null>(null)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [tables, setTables] = useState<TableData[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKeys | null>(null)
  const [activeTab, setActiveTab] = useState<'tables' | 'storage' | 'auth' | 'api'>('tables')
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
  const [showNewTableInput, setShowNewTableInput] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)

  const [newRowData, setNewRowData] = useState<Record<string, string>>({})
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editRowData, setEditRowData] = useState<Record<string, unknown>>({})
  const [showInsertRow, setShowInsertRow] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

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
        const data = await response.json();
        setAdminToken(token);
        setAccountId(data.accountId);
        setAccountName(data.accountName);
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
        setAccountId(data.accountId);
        setAccountName(data.accountName);
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
    setAccountId(null)
    setAccountName(null)
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
        setProjects([])
        return
      }
      const data = await response.json()
      setProjects(Array.isArray(data) ? data : [])
    } catch {
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
      console.error('Ошибка создания проекта:', error)
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
      console.error('Ошибка удаления проекта:', error)
    }
  }

  const selectProject = async (project: Project) => {
    setCurrentProject(project)
    setApiKeys(project.apiKeys || null)
    setActiveTab('tables')
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
        setTables([])
        return
      }
      const data = await response.json()
      const tablesData = Array.isArray(data) ? data : []
      setTables(tablesData)
      if (tablesData.length > 0 && !selectedTable) {
        setSelectedTable(tablesData[0])
      }
    } catch {
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
      setShowNewTableInput(false)
      setSelectedTable(data)
    } catch (error) {
      console.error('Ошибка создания таблицы:', error)
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
      const newTables = tables.filter(t => t.name !== tableName)
      setTables(newTables)
      if (selectedTable?.name === tableName) {
        setSelectedTable(newTables[0] || null)
      }
    } catch (error) {
      console.error('Ошибка удаления таблицы:', error)
    }
  }

  const addColumn = async () => {
    if (!newColumnName.trim() || !currentProject || !selectedTable) return
    try {
      setLoading(true)
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
      setNewColumnType('text')
      setShowAddColumn(false)
    } catch (error) {
      console.error('Ошибка добавления колонки:', error)
    } finally {
      setLoading(false)
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
      console.error('Ошибка обновления колонки:', error)
    }
  }

  const deleteColumn = async (columnName: string) => {
    if (!currentProject || !selectedTable) return
    if (!confirm(`Удалить колонку "${columnName}"?`)) return
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
      console.error('Ошибка удаления колонки:', error)
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
      setShowInsertRow(false)
    } catch (error) {
      console.error('Ошибка добавления записи:', error)
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
      console.error('Ошибка обновления записи:', error)
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
      console.error('Ошибка удаления записи:', error)
    }
  }

  const loadAuthUsers = async (projectId: string) => {
    try {
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/auth/users`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      const contentType = response.headers.get('content-type')
      if (!response.ok || !contentType?.includes('application/json')) {
        setAuthUsers([])
        return
      }
      const data = await response.json()
      setAuthUsers(Array.isArray(data) ? data : [])
    } catch {
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
      console.error('Ошибка удаления пользователя:', error)
    }
  }

  const loadBuckets = async (projectId: string) => {
    try {
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/storage/buckets`), {
        headers: { 'X-Admin-Token': adminToken || '' }
      })
      const contentType = response.headers.get('content-type')
      if (!response.ok || !contentType?.includes('application/json')) {
        setBuckets([])
        return
      }
      const data = await response.json()
      setBuckets(Array.isArray(data) ? data : [])
    } catch {
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
      console.error('Ошибка создания bucket:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteBucket = async (bucketName: string) => {
    if (!currentProject) return
    if (!confirm('Удалить этот bucket?')) return
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
      console.error('Ошибка удаления bucket:', error)
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
        setBucketFiles([])
        return
      }
      const data = await response.json()
      setBucketFiles(Array.isArray(data) ? data : [])
    } catch {
      setBucketFiles([])
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const getTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'int': case 'int4': case 'int8': case 'integer': case 'float8': case 'numeric':
        return 'text-blue-400'
      case 'text': case 'varchar': case 'char':
        return 'text-emerald-400'
      case 'boolean': case 'bool':
        return 'text-purple-400'
      case 'timestamp': case 'timestamptz': case 'date': case 'time':
        return 'text-amber-400'
      case 'json': case 'jsonb':
        return 'text-orange-400'
      case 'uuid':
        return 'text-cyan-400'
      default:
        return 'text-gray-400'
    }
  }

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0d1117] flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(62, 207, 142, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)'}}></div>
        <Card className="w-full max-w-lg bg-[#161616]/90 backdrop-blur-xl border-[#2a2a2a] shadow-2xl relative z-10">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                <img src={logoImage} alt="KICH DB" className="w-48 h-48 object-contain relative z-10" />
              </div>
            </div>
            <CardTitle className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 tracking-tight">
              KICH DB
            </CardTitle>
            <CardDescription className="text-gray-400 mt-3 text-lg">
              Система управления базами данных
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-8 px-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Input
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="h-14 text-lg bg-[#0d0d0d] border-[#2a2a2a] text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl"
                />
              </div>
              {authError && (
                <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-xl border border-red-400/20">{authError}</p>
              )}
              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-black font-bold text-lg rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40" 
                disabled={authLoading}
              >
                {authLoading ? 'Вход...' : 'Войти'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0d1117]">
        <header className="border-b border-[#2a2a2a] bg-[#161616]/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center justify-between px-8 py-4">
            <div className="flex items-center gap-5">
              <img src={logoImage} alt="KICH DB" className="w-14 h-14 object-contain" />
              <div>
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">KICH DB</h1>
                <p className="text-sm text-gray-500">{accountName}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] gap-2">
              <LogOut className="w-4 h-4" />
              Выйти
            </Button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white">Проекты</h2>
              <p className="text-gray-500 mt-1">Управляйте вашими базами данных</p>
            </div>
          </div>

          <Card className="mb-10 bg-[#161616]/80 backdrop-blur-xl border-[#2a2a2a] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5"></div>
            <CardContent className="pt-6 relative">
              <div className="flex gap-4">
                <Input
                  placeholder="Название нового проекта..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                  className="h-12 bg-[#0d0d0d] border-[#2a2a2a] text-white placeholder:text-gray-500 text-lg rounded-xl flex-1"
                />
                <Button 
                  onClick={createProject} 
                  disabled={loading} 
                  className="h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-black font-semibold px-8 rounded-xl shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Создать проект
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="bg-[#161616]/80 backdrop-blur-xl border-[#2a2a2a] hover:border-emerald-500/50 transition-all cursor-pointer group overflow-hidden"
                onClick={() => selectProject(project)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-cyan-500/0 group-hover:from-emerald-500/5 group-hover:to-cyan-500/5 transition-all"></div>
                <CardHeader className="pb-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <Database className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-xl font-bold">{project.name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {project.created ? new Date(project.created).toLocaleDateString('ru-RU') : 'Создан'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteProject(project.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 relative">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-sm text-emerald-400 font-medium">Активен</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2a] rounded-full">
                      <Globe className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-400">API</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {projects.length === 0 && !loading && (
            <div className="text-center py-20">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Database className="w-12 h-12 text-gray-500" />
              </div>
              <p className="text-gray-300 text-xl font-medium">Пока нет проектов</p>
              <p className="text-gray-500 mt-2">Создайте первый проект для начала работы</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="border-b border-[#2a2a2a] bg-[#161616] flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentProject(null)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={logoImage} alt="KICH DB" className="w-10 h-10 object-contain" />
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">KICH</span>
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium text-lg">{currentProject.name}</span>
            <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-0 font-medium">PRODUCTION</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{accountName}</span>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-16 border-r border-[#2a2a2a] bg-[#161616] flex flex-col items-center py-4 gap-3 flex-shrink-0">
          <button
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTab === 'tables' ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]'}`}
            onClick={() => setActiveTab('tables')}
            title="Редактор таблиц"
          >
            <TableIcon className="w-5 h-5" />
          </button>
          <button
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTab === 'auth' ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]'}`}
            onClick={() => setActiveTab('auth')}
            title="Аутентификация"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTab === 'storage' ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]'}`}
            onClick={() => setActiveTab('storage')}
            title="Хранилище"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTab === 'api' ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]'}`}
            onClick={() => setActiveTab('api')}
            title="API Ключи"
          >
            <Key className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#2a2a2a] transition-all" title="Настройки">
            <Settings className="w-5 h-5" />
          </button>
        </aside>

        {activeTab === 'tables' && (
          <>
            <aside className="w-64 border-r border-[#2a2a2a] bg-[#161616] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl text-sm text-gray-400">
                  <Search className="w-4 h-4" />
                  <span>Поиск таблиц...</span>
                </div>
              </div>
              <div className="p-4 border-b border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Схема</span>
                  <Badge className="bg-[#2a2a2a] text-gray-300 border-0 text-xs">public</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-3">
                  <button
                    onClick={() => setShowNewTableInput(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 text-emerald-400 rounded-xl transition-all border border-emerald-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    Новая таблица
                  </button>
                  {showNewTableInput && (
                    <div className="mt-3">
                      <Input
                        placeholder="имя_таблицы"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') createTable()
                          if (e.key === 'Escape') setShowNewTableInput(false)
                        }}
                        autoFocus
                        className="h-10 text-sm bg-[#0d0d0d] border-emerald-500 text-white rounded-xl"
                      />
                    </div>
                  )}
                </div>
                <div className="px-3 space-y-1">
                  {tables.map((table) => (
                    <div key={table.id} className="group relative">
                      <button
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all ${selectedTable?.id === table.id ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`}
                        onClick={() => setSelectedTable(table)}
                      >
                        <TableIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate font-medium">{table.name}</span>
                        <Badge className="ml-auto bg-[#2a2a2a] text-gray-400 border-0 text-xs">{table.rows.length}</Badge>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTable(table.name)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden bg-[#0d0d0d]">
              {selectedTable ? (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-[#161616]">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                          <TableIcon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-white text-lg">{selectedTable.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] h-9 rounded-lg">
                        <Filter className="w-4 h-4 mr-2" />
                        Фильтр
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] h-9 rounded-lg">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Сортировка
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 h-9 rounded-lg"
                        onClick={() => setShowAddColumn(true)}
                      >
                        <Columns className="w-4 h-4 mr-2" />
                        Добавить колонку
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-black font-semibold h-9 rounded-lg shadow-lg"
                        onClick={() => setShowInsertRow(true)}
                      >
                        <Rows className="w-4 h-4 mr-2" />
                        Добавить запись
                      </Button>
                    </div>
                  </div>

                  {showAddColumn && (
                    <div className="border-b border-[#2a2a2a] bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 p-6">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Columns className="w-5 h-5 text-emerald-400" />
                        Добавить новую колонку
                      </h3>
                      <div className="flex items-end gap-4">
                        <div className="flex-1">
                          <label className="text-sm text-gray-400 mb-2 block">Название колонки</label>
                          <Input
                            placeholder="имя_колонки"
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            className="h-11 bg-[#0d0d0d] border-[#2a2a2a] text-white rounded-xl"
                          />
                        </div>
                        <div className="w-48">
                          <label className="text-sm text-gray-400 mb-2 block">Тип данных</label>
                          <select
                            value={newColumnType}
                            onChange={(e) => setNewColumnType(e.target.value)}
                            className="w-full h-11 px-4 bg-[#0d0d0d] border border-[#2a2a2a] text-white rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                          >
                            <option value="text">text</option>
                            <option value="integer">integer</option>
                            <option value="float8">float8</option>
                            <option value="boolean">boolean</option>
                            <option value="timestamp">timestamp</option>
                            <option value="uuid">uuid</option>
                            <option value="json">json</option>
                            <option value="jsonb">jsonb</option>
                          </select>
                        </div>
                        <Button 
                          onClick={addColumn} 
                          disabled={loading || !newColumnName.trim()}
                          className="h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-black font-semibold px-6 rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Добавить
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => { setShowAddColumn(false); setNewColumnName(''); setNewColumnType('text') }}
                          className="h-11 text-gray-400 rounded-xl"
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  )}

                  {showInsertRow && (
                    <div className="border-b border-[#2a2a2a] bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 p-6">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Rows className="w-5 h-5 text-cyan-400" />
                        Добавить новую запись
                      </h3>
                      <div className="flex items-end gap-4 flex-wrap">
                        {selectedTable.columns.filter(c => !c.primary).map((col) => (
                          <div key={col.name} className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">{col.name} <span className={`text-xs ${getTypeColor(col.type)}`}>({col.type})</span></label>
                            <Input
                              placeholder={col.type}
                              value={newRowData[col.name] || ''}
                              onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                              className="h-10 w-44 text-sm bg-[#0d0d0d] border-[#2a2a2a] text-white rounded-xl"
                            />
                          </div>
                        ))}
                        <Button onClick={addRow} className="h-10 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-black font-semibold px-6 rounded-xl">
                          Сохранить
                        </Button>
                        <Button variant="ghost" onClick={() => { setShowInsertRow(false); setNewRowData({}) }} className="h-10 text-gray-400 rounded-xl">
                          Отмена
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#161616]">
                          <th className="w-14 px-4 py-4 text-left border-b border-r border-[#2a2a2a]">
                            <input type="checkbox" className="rounded border-[#3a3a3a] bg-transparent accent-emerald-500" />
                          </th>
                          <th className="w-14 px-4 py-4 text-center text-gray-500 font-medium border-b border-r border-[#2a2a2a]">#</th>
                          {selectedTable.columns.map((col) => (
                            <th key={col.name} className="px-4 py-4 text-left border-b border-r border-[#2a2a2a] min-w-[180px] group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {editingColumn === col.name ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={editColumnName}
                                        onChange={(e) => setEditColumnName(e.target.value)}
                                        className="h-8 w-28 text-sm bg-[#0d0d0d] border-emerald-500 text-white"
                                      />
                                      <select
                                        value={editColumnType}
                                        onChange={(e) => setEditColumnType(e.target.value)}
                                        className="h-8 px-2 bg-[#0d0d0d] border border-[#2a2a2a] text-white text-xs rounded"
                                      >
                                        <option value="text">text</option>
                                        <option value="integer">integer</option>
                                        <option value="float8">float8</option>
                                        <option value="boolean">boolean</option>
                                        <option value="timestamp">timestamp</option>
                                        <option value="uuid">uuid</option>
                                        <option value="json">json</option>
                                      </select>
                                      <button onClick={() => updateColumn(col.name)} className="p-1 hover:bg-emerald-500/20 rounded">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                      </button>
                                      <button onClick={() => setEditingColumn(null)} className="p-1 hover:bg-red-500/20 rounded">
                                        <X className="w-4 h-4 text-red-400" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-white font-semibold">{col.name}</span>
                                      <span className={`text-xs font-normal ${getTypeColor(col.type)}`}>{col.type}</span>
                                      {col.primary && (
                                        <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px] px-1.5 py-0 font-medium">PK</Badge>
                                      )}
                                    </>
                                  )}
                                </div>
                                {!col.primary && editingColumn !== col.name && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditColumn(col)} className="p-1 hover:bg-[#2a2a2a] rounded">
                                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button onClick={() => deleteColumn(col.name)} className="p-1 hover:bg-red-500/20 rounded">
                                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </th>
                          ))}
                          <th className="w-20 px-4 py-4 border-b border-[#2a2a2a]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTable.rows.map((row, index) => {
                          const rowData = row as Record<string, unknown>
                          const rowId = rowData.id as string
                          return (
                            <tr key={rowId || index} className="border-b border-[#2a2a2a] hover:bg-[#161616]/50 group transition-colors">
                              <td className="px-4 py-3 border-r border-[#2a2a2a]">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-[#3a3a3a] bg-transparent accent-emerald-500"
                                  checked={selectedRows.has(rowId)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedRows)
                                    if (e.target.checked) {
                                      newSelected.add(rowId)
                                    } else {
                                      newSelected.delete(rowId)
                                    }
                                    setSelectedRows(newSelected)
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3 text-center text-gray-500 text-xs font-mono border-r border-[#2a2a2a]">{index + 1}</td>
                              {selectedTable.columns.map((col) => (
                                <td key={col.name} className="px-4 py-3 border-r border-[#2a2a2a]">
                                  {editingRow === rowId ? (
                                    col.primary ? (
                                      <span className="text-gray-500 font-mono">{formatCellValue(rowData[col.name])}</span>
                                    ) : (
                                      <Input
                                        value={String(editRowData[col.name] ?? '')}
                                        onChange={(e) => setEditRowData({ ...editRowData, [col.name]: e.target.value })}
                                        className="h-8 text-sm bg-[#0d0d0d] border-emerald-500 text-white"
                                      />
                                    )
                                  ) : (
                                    <span className={`font-mono text-sm ${rowData[col.name] === null || rowData[col.name] === undefined ? 'text-gray-600 italic' : 'text-gray-300'}`}>
                                      {formatCellValue(rowData[col.name])}
                                    </span>
                                  )}
                                </td>
                              ))}
                              <td className="px-4 py-3">
                                {editingRow === rowId ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => updateRow(rowId)} className="p-1.5 hover:bg-emerald-500/20 rounded-lg">
                                      <Check className="w-4 h-4 text-emerald-400" />
                                    </button>
                                    <button onClick={() => { setEditingRow(null); setEditRowData({}) }} className="p-1.5 hover:bg-red-500/20 rounded-lg">
                                      <X className="w-4 h-4 text-red-400" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingRow(rowId); setEditRowData(rowData) }} className="p-1.5 hover:bg-[#2a2a2a] rounded-lg">
                                      <Pencil className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button onClick={() => deleteRow(rowId)} className="p-1.5 hover:bg-red-500/20 rounded-lg">
                                      <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                        {selectedTable.rows.length === 0 && (
                          <tr>
                            <td colSpan={selectedTable.columns.length + 3} className="px-6 py-16 text-center">
                              <div className="w-16 h-16 rounded-2xl bg-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
                                <Rows className="w-8 h-8 text-gray-500" />
                              </div>
                              <p className="text-gray-400 text-lg">Нет записей</p>
                              <p className="text-gray-600 text-sm mt-1">Нажмите "Добавить запись" чтобы добавить данные</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between px-6 py-3 border-t border-[#2a2a2a] bg-[#161616] text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">Страница</span>
                      <div className="flex items-center gap-2">
                        <Input className="w-16 h-8 text-center bg-[#0d0d0d] border-[#2a2a2a] text-white text-sm rounded-lg" defaultValue="1" />
                        <span className="text-gray-500">из 1</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-[#2a2a2a] text-gray-300 border-0">{selectedTable.columns.length} колонок</Badge>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0">{selectedTable.rows.length} записей</Badge>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
                      <TableIcon className="w-10 h-10 text-gray-500" />
                    </div>
                    <p className="text-gray-300 text-lg font-medium">Выберите таблицу</p>
                    <p className="text-gray-500 text-sm mt-1">Или создайте новую в боковой панели</p>
                  </div>
                </div>
              )}
            </main>
          </>
        )}

        {activeTab === 'auth' && (
          <main className="flex-1 p-8 overflow-auto bg-[#0d0d0d]">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Users className="w-7 h-7 text-emerald-400" />
                Аутентификация
              </h2>
              <Card className="bg-[#161616] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">Пользователи</CardTitle>
                </CardHeader>
                <CardContent>
                  {authUsers.length > 0 ? (
                    <div className="space-y-3">
                      {authUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-[#0d0d0d] rounded-xl border border-[#2a2a2a]">
                          <div>
                            <p className="text-white font-medium">{user.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Создан: {new Date(user.created_at).toLocaleDateString('ru-RU')}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteAuthUser(user.id)} className="hover:bg-red-500/20">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-500">Пока нет пользователей</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        )}

        {activeTab === 'storage' && (
          <main className="flex-1 p-8 overflow-auto bg-[#0d0d0d]">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <FolderOpen className="w-7 h-7 text-emerald-400" />
                Хранилище
              </h2>
              
              {!selectedBucket ? (
                <>
                  <Card className="mb-6 bg-[#161616] border-[#2a2a2a]">
                    <CardContent className="pt-6">
                      <div className="flex gap-4 items-center">
                        <Input
                          placeholder="Название bucket"
                          value={newBucketName}
                          onChange={(e) => setNewBucketName(e.target.value)}
                          className="bg-[#0d0d0d] border-[#2a2a2a] text-white rounded-xl"
                        />
                        <label className="flex items-center gap-2 text-gray-400 text-sm whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={newBucketPublic}
                            onChange={(e) => setNewBucketPublic(e.target.checked)}
                            className="rounded border-[#3a3a3a] accent-emerald-500"
                          />
                          Публичный
                        </label>
                        <Button onClick={createBucket} disabled={loading} className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-black rounded-xl">
                          <Plus className="w-4 h-4 mr-2" />
                          Создать
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {buckets.map((bucket) => (
                      <Card 
                        key={bucket.id} 
                        className="bg-[#161616] border-[#2a2a2a] hover:border-emerald-500/50 cursor-pointer transition-all"
                        onClick={() => loadBucketFiles(bucket)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                              <FolderOpen className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-white font-medium">{bucket.name}</span>
                            {bucket.public && <Badge className="bg-blue-500/20 text-blue-400 border-0">Публичный</Badge>}
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteBucket(bucket.name)
                              }}
                              className="hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {buckets.length === 0 && (
                    <div className="text-center py-16">
                      <FolderOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-500">Нет buckets</p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <Button variant="ghost" onClick={() => setSelectedBucket(null)} className="mb-4 text-gray-400">
                    ← Назад к buckets
                  </Button>
                  <h3 className="text-xl font-bold text-white mb-4">{selectedBucket.name}</h3>
                  {bucketFiles.length > 0 ? (
                    <div className="space-y-2">
                      {bucketFiles.map((file) => (
                        <div key={file.id} className="p-4 bg-[#161616] border border-[#2a2a2a] rounded-xl flex items-center justify-between">
                          <span className="text-white">{file.name}</span>
                          <span className="text-gray-500 text-sm">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-12">Нет файлов в этом bucket</p>
                  )}
                </div>
              )}
            </div>
          </main>
        )}

        {activeTab === 'api' && (
          <main className="flex-1 p-8 overflow-auto bg-[#0d0d0d]">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Key className="w-7 h-7 text-emerald-400" />
                API Ключи
              </h2>
              <p className="text-gray-400 mb-8">
                Используйте эти ключи для подключения к вашей базе данных из любого приложения или сервиса.
              </p>
              
              {apiKeys ? (
                <div className="space-y-6">
                  <Card className="bg-[#161616] border-[#2a2a2a]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">Anon Key (Публичный)</CardTitle>
                          <p className="text-sm text-gray-500">Для клиентских приложений</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 p-4 bg-[#0d0d0d] rounded-xl text-sm text-gray-300 font-mono overflow-hidden border border-[#2a2a2a]">
                          {showApiKey['anon'] ? apiKeys.anon : '••••••••••••••••••••••••••••••••••••••••'}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => setShowApiKey({...showApiKey, anon: !showApiKey['anon']})} className="hover:bg-[#2a2a2a]">
                          {showApiKey['anon'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKeys.anon, 'anon')} className="hover:bg-[#2a2a2a]">
                          {copied === 'anon' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#161616] border-[#2a2a2a]">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">Service Key (Секретный)</CardTitle>
                          <p className="text-sm text-gray-500">Только для серверных приложений</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 p-4 bg-[#0d0d0d] rounded-xl text-sm text-gray-300 font-mono overflow-hidden border border-[#2a2a2a]">
                          {showApiKey['service'] ? apiKeys.service : '••••••••••••••••••••••••••••••••••••••••'}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => setShowApiKey({...showApiKey, service: !showApiKey['service']})} className="hover:bg-[#2a2a2a]">
                          {showApiKey['service'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKeys.service, 'service')} className="hover:bg-[#2a2a2a]">
                          {copied === 'service' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/30">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-emerald-400" />
                        <p className="text-gray-300 text-sm">
                          Подключайтесь к базе данных с любого устройства или сервиса используя REST API или SDK
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-gray-500">API ключи не найдены</p>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  )
}
