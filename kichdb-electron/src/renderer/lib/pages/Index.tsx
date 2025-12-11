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
  HardDrive,
  Pencil,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Search,
  Settings,
  Shield
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tables' | 'storage' | 'auth' | 'api'>('tables')
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
      const newTables = tables.filter(t => t.name !== tableName)
      setTables(newTables)
      if (selectedTable?.name === tableName) {
        setSelectedTable(newTables[0] || null)
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
      setShowInsertRow(false)
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
      console.error('Error creating bucket:', error)
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
        return 'text-green-400'
      case 'boolean': case 'bool':
        return 'text-purple-400'
      case 'timestamp': case 'timestamptz': case 'date': case 'time':
        return 'text-yellow-400'
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
      <div className="min-h-screen bg-[#171717] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1f1f1f] border-[#2a2a2a] shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-6">
              <img src={logoImage} alt="KICH DB" className="w-32 h-32 object-contain" />
            </div>
            <CardTitle className="text-3xl font-bold text-white tracking-tight">KICH DB</CardTitle>
            <CardDescription className="text-gray-500 mt-2">
              Database Management System
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="h-11 bg-[#0d0d0d] border-[#2a2a2a] text-white placeholder:text-gray-600 focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/20"
                />
              </div>
              {authError && (
                <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded">{authError}</p>
              )}
              <Button type="submit" className="w-full h-11 bg-[#3ecf8e] hover:bg-[#36b77d] text-black font-semibold text-base" disabled={authLoading}>
                {authLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-[#171717]">
        <header className="border-b border-[#2a2a2a] bg-[#1f1f1f]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <img src={logoImage} alt="KICH DB" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-white">KICH DB</h1>
                <p className="text-xs text-gray-500">{accountName}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Projects</h2>
          </div>

          <Card className="mb-8 bg-[#1f1f1f] border-[#2a2a2a]">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                  className="bg-[#0d0d0d] border-[#2a2a2a] text-white placeholder:text-gray-600"
                />
                <Button onClick={createProject} disabled={loading} className="bg-[#3ecf8e] hover:bg-[#36b77d] text-black font-medium px-6">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="bg-[#1f1f1f] border-[#2a2a2a] hover:border-[#3ecf8e]/50 transition-all cursor-pointer group"
                onClick={() => selectProject(project)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3ecf8e] to-[#1f8a5e] flex items-center justify-center">
                        <Database className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{project.name}</CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {project.created ? new Date(project.created).toLocaleDateString() : 'Created'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteProject(project.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3ecf8e]"></span>
                    <span className="text-sm text-gray-400">{project.status || 'Active'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {projects.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-lg">No projects yet</p>
              <p className="text-gray-600 text-sm mt-1">Create your first project to get started</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#171717] flex flex-col">
      <header className="border-b border-[#2a2a2a] bg-[#1f1f1f] flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentProject(null)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logoImage} alt="KICH DB" className="w-8 h-8 object-contain" />
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium">{currentProject.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-gray-400">main</span>
            <Badge className="ml-2 bg-[#3ecf8e]/20 text-[#3ecf8e] border-0 text-xs font-normal">PRODUCTION</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] text-sm">
              Feedback
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-14 border-r border-[#2a2a2a] bg-[#1f1f1f] flex flex-col items-center py-4 gap-2 flex-shrink-0">
          <button
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'tables' ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]/50'}`}
            onClick={() => setActiveTab('tables')}
            title="Table Editor"
          >
            <TableIcon className="w-5 h-5" />
          </button>
          <button
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'auth' ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]/50'}`}
            onClick={() => setActiveTab('auth')}
            title="Authentication"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'storage' ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]/50'}`}
            onClick={() => setActiveTab('storage')}
            title="Storage"
          >
            <FolderOpen className="w-5 h-5" />
          </button>
          <button
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'api' ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]/50'}`}
            onClick={() => setActiveTab('api')}
            title="API Settings"
          >
            <Key className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#2a2a2a]/50 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </aside>

        {activeTab === 'tables' && (
          <>
            <aside className="w-56 border-r border-[#2a2a2a] bg-[#1f1f1f] flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded text-sm text-gray-400">
                  <Search className="w-4 h-4" />
                  <span>Search tables</span>
                </div>
              </div>
              <div className="p-3 border-b border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">schema</span>
                  <span className="text-xs text-gray-400">public</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                  <button
                    onClick={() => setShowNewTableInput(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New table
                  </button>
                  {showNewTableInput && (
                    <div className="mt-2 px-2">
                      <Input
                        placeholder="table_name"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') createTable()
                          if (e.key === 'Escape') setShowNewTableInput(false)
                        }}
                        autoFocus
                        className="h-8 text-sm bg-[#0d0d0d] border-[#3ecf8e] text-white"
                      />
                    </div>
                  )}
                </div>
                <div className="px-2">
                  {tables.map((table) => (
                    <div key={table.id} className="group relative">
                      <button
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${selectedTable?.id === table.id ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]/50'}`}
                        onClick={() => setSelectedTable(table)}
                      >
                        <TableIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{table.name}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteTable(table.name)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden bg-[#171717]">
              {selectedTable ? (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#1f1f1f]">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <TableIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-white">{selectedTable.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] h-8">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] h-8">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        Sort
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        className="bg-[#3ecf8e] hover:bg-[#36b77d] text-black font-medium h-8"
                        onClick={() => setShowInsertRow(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Insert
                      </Button>
                      <div className="flex items-center gap-2 ml-4 px-3 py-1.5 bg-[#2a2a2a] rounded text-sm">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">Role</span>
                        <span className="text-white">postgres</span>
                      </div>
                    </div>
                  </div>

                  {showInsertRow && (
                    <div className="border-b border-[#2a2a2a] bg-[#1a1a1a] p-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        {selectedTable.columns.filter(c => !c.primary).map((col) => (
                          <div key={col.name} className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">{col.name}</label>
                            <Input
                              placeholder={col.type}
                              value={newRowData[col.name] || ''}
                              onChange={(e) => setNewRowData({ ...newRowData, [col.name]: e.target.value })}
                              className="h-8 w-40 text-sm bg-[#0d0d0d] border-[#2a2a2a] text-white"
                            />
                          </div>
                        ))}
                        <div className="flex items-end gap-2">
                          <Button size="sm" onClick={addRow} className="bg-[#3ecf8e] hover:bg-[#36b77d] text-black h-8">
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowInsertRow(false); setNewRowData({}) }} className="text-gray-400 h-8">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#1f1f1f] border-b border-[#2a2a2a]">
                          <th className="w-12 px-4 py-2 text-left">
                            <input type="checkbox" className="rounded border-[#3a3a3a] bg-transparent" />
                          </th>
                          <th className="w-12 px-2 py-2 text-center text-gray-500 font-normal"></th>
                          {selectedTable.columns.map((col) => (
                            <th key={col.name} className="px-4 py-2 text-left border-l border-[#2a2a2a] min-w-[150px]">
                              <div className="flex items-center gap-2">
                                <input type="checkbox" className="rounded border-[#3a3a3a] bg-transparent" />
                                <span className="text-white font-medium">{col.name}</span>
                                <span className={`text-xs ${getTypeColor(col.type)}`}>{col.type}</span>
                                {col.primary && (
                                  <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-[10px] px-1.5 py-0">PK</Badge>
                                )}
                              </div>
                            </th>
                          ))}
                          <th className="w-10 px-2 py-2 border-l border-[#2a2a2a]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTable.rows.map((row, index) => {
                          const rowData = row as Record<string, unknown>
                          const rowId = rowData.id as string
                          return (
                            <tr key={rowId || index} className="border-b border-[#2a2a2a] hover:bg-[#1f1f1f]/50 group">
                              <td className="px-4 py-2">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-[#3a3a3a] bg-transparent"
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
                              <td className="px-2 py-2 text-center text-gray-500 text-xs">{index + 1}</td>
                              {selectedTable.columns.map((col) => (
                                <td key={col.name} className="px-4 py-2 border-l border-[#2a2a2a]">
                                  {editingRow === rowId ? (
                                    col.primary ? (
                                      <span className="text-gray-400">{formatCellValue(rowData[col.name])}</span>
                                    ) : (
                                      <Input
                                        value={String(editRowData[col.name] ?? '')}
                                        onChange={(e) => setEditRowData({ ...editRowData, [col.name]: e.target.value })}
                                        className="h-7 text-sm bg-[#0d0d0d] border-[#3ecf8e] text-white"
                                      />
                                    )
                                  ) : (
                                    <span className={rowData[col.name] === null || rowData[col.name] === undefined ? 'text-gray-600 italic' : 'text-gray-300'}>
                                      {formatCellValue(rowData[col.name])}
                                    </span>
                                  )}
                                </td>
                              ))}
                              <td className="px-2 py-2 border-l border-[#2a2a2a]">
                                {editingRow === rowId ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => updateRow(rowId)} className="p-1 hover:bg-[#3ecf8e]/20 rounded">
                                      <Check className="w-4 h-4 text-[#3ecf8e]" />
                                    </button>
                                    <button onClick={() => { setEditingRow(null); setEditRowData({}) }} className="p-1 hover:bg-red-500/20 rounded">
                                      <X className="w-4 h-4 text-red-400" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingRow(rowId); setEditRowData(rowData) }} className="p-1 hover:bg-[#2a2a2a] rounded">
                                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                    <button onClick={() => deleteRow(rowId)} className="p-1 hover:bg-red-500/20 rounded">
                                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                        {selectedTable.rows.length === 0 && (
                          <tr>
                            <td colSpan={selectedTable.columns.length + 3} className="px-4 py-12 text-center text-gray-500">
                              No rows yet. Click Insert to add data.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between px-4 py-2 border-t border-[#2a2a2a] bg-[#1f1f1f] text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">Page</span>
                      <Input className="w-16 h-7 text-center bg-[#0d0d0d] border-[#2a2a2a] text-white text-sm" defaultValue="1" />
                      <span className="text-gray-400">of 1</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">{selectedTable.rows.length} rows</span>
                      <span className="text-gray-400">{selectedTable.rows.length} records</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <TableIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Select a table to view data</p>
                  </div>
                </div>
              )}
            </main>
          </>
        )}

        {activeTab === 'auth' && (
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-white mb-6">Authentication</h2>
              <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white">Users</CardTitle>
                </CardHeader>
                <CardContent>
                  {authUsers.length > 0 ? (
                    <div className="space-y-2">
                      {authUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-[#0d0d0d] rounded border border-[#2a2a2a]">
                          <div>
                            <p className="text-white">{user.email}</p>
                            <p className="text-xs text-gray-500">Created: {new Date(user.created_at).toLocaleDateString()}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteAuthUser(user.id)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No users yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        )}

        {activeTab === 'storage' && (
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-bold text-white mb-6">Storage</h2>
              
              {!selectedBucket ? (
                <>
                  <Card className="mb-6 bg-[#1f1f1f] border-[#2a2a2a]">
                    <CardContent className="pt-6">
                      <div className="flex gap-3 items-center">
                        <Input
                          placeholder="Bucket name"
                          value={newBucketName}
                          onChange={(e) => setNewBucketName(e.target.value)}
                          className="bg-[#0d0d0d] border-[#2a2a2a] text-white"
                        />
                        <label className="flex items-center gap-2 text-gray-400 text-sm whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={newBucketPublic}
                            onChange={(e) => setNewBucketPublic(e.target.checked)}
                            className="rounded border-[#3a3a3a]"
                          />
                          Public
                        </label>
                        <Button onClick={createBucket} disabled={loading} className="bg-[#3ecf8e] hover:bg-[#36b77d] text-black">
                          <Plus className="w-4 h-4 mr-2" />
                          Create
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    {buckets.map((bucket) => (
                      <Card 
                        key={bucket.id} 
                        className="bg-[#1f1f1f] border-[#2a2a2a] hover:border-[#3a3a3a] cursor-pointer transition-colors"
                        onClick={() => loadBucketFiles(bucket)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="w-5 h-5 text-gray-400" />
                            <span className="text-white">{bucket.name}</span>
                            {bucket.public && <Badge className="bg-blue-500/20 text-blue-400 border-0">Public</Badge>}
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
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {buckets.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No buckets yet</p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <Button variant="ghost" onClick={() => setSelectedBucket(null)} className="mb-4 text-gray-400">
                    ← Back to buckets
                  </Button>
                  <h3 className="text-xl font-bold text-white mb-4">{selectedBucket.name}</h3>
                  {bucketFiles.length > 0 ? (
                    <div className="space-y-2">
                      {bucketFiles.map((file) => (
                        <div key={file.id} className="p-3 bg-[#1f1f1f] border border-[#2a2a2a] rounded flex items-center justify-between">
                          <span className="text-white">{file.name}</span>
                          <span className="text-gray-500 text-sm">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No files in this bucket</p>
                  )}
                </div>
              )}
            </div>
          </main>
        )}

        {activeTab === 'api' && (
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">API Keys</h2>
              
              {apiKeys ? (
                <div className="space-y-4">
                  <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-400">Anon Key (Public)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-[#0d0d0d] rounded text-sm text-gray-300 font-mono overflow-hidden">
                          {showApiKey['anon'] ? apiKeys.anon : '••••••••••••••••••••••••••••••••'}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => setShowApiKey({...showApiKey, anon: !showApiKey['anon']})}>
                          {showApiKey['anon'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKeys.anon, 'anon')}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#1f1f1f] border-[#2a2a2a]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-400">Service Key (Secret)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-[#0d0d0d] rounded text-sm text-gray-300 font-mono overflow-hidden">
                          {showApiKey['service'] ? apiKeys.service : '••••••••••••••••••••••••••••••••'}
                        </code>
                        <Button variant="ghost" size="icon" onClick={() => setShowApiKey({...showApiKey, service: !showApiKey['service']})}>
                          {showApiKey['service'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKeys.service, 'service')}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-gray-500">No API keys available</p>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  )
}
