import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Database, Plus, Trash2, Download, TableIcon, Pencil, Check, X } from 'lucide-react'
import { apiUrl } from '@/lib/api'

interface Column {
  name: string
  type: string
  primary?: boolean
}

interface Row {
  [key: string]: unknown
}

interface TableData {
  id: string
  name: string
  columns: Column[]
  rows: Row[]
}

export default function DataBrowser() {
  const [tables, setTables] = useState<TableData[]>([])
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [editingRow, setEditingRow] = useState<Row | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingColumn, setEditingColumn] = useState<{ oldName: string; newName: string; newType: string } | null>(null)
  const [newColumn, setNewColumn] = useState<{ name: string; type: string } | null>(null)

  const projectId = new URLSearchParams(window.location.search).get('projectId')
  const apiKey = new URLSearchParams(window.location.search).get('apiKey')

  useEffect(() => {
    if (projectId && apiKey) {
      loadTables()
    }
  }, [projectId, apiKey])

  const loadTables = async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl(`/admin/projects/${projectId}/tables`))
      const data: TableData[] = await response.json()
      setTables(data)
      if (data.length > 0) {
        setSelectedTable(data[0])
        setRows(data[0].rows || [])
      }
    } catch (error) {
      console.error('Error loading tables:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTableData = async (table: TableData) => {
    setSelectedTable(table)
    setRows(table.rows || [])
  }

  const addRow = () => {
    const newRow: Row = {}
    if (selectedTable) {
      selectedTable.columns.forEach((col) => {
        newRow[col.name] = ''
      })
    }
    setEditingRow(newRow)
  }

  const saveRow = async () => {
    if (!editingRow || !selectedTable || !projectId || !apiKey) return

    try {
      setLoading(true)
      const response = await fetch(
        apiUrl(`/projects/${projectId}/${selectedTable.name}`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editingRow),
        }
      )
      const data = await response.json()
      setRows([...rows, data])
      setEditingRow(null)
      await loadTables()
    } catch (error) {
      console.error('Error saving row:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteRow = async (row: Row) => {
    if (!selectedTable || !projectId || !apiKey) return
    if (!confirm('Удалить эту запись?')) return

    try {
      setLoading(true)
      await fetch(
        apiUrl(`/projects/${projectId}/${selectedTable.name}/${row.id}`),
        {
          method: 'DELETE',
        }
      )
      setRows(rows.filter((r) => r.id !== row.id))
      await loadTables()
    } catch (error) {
      console.error('Error deleting row:', error)
    } finally {
      setLoading(false)
    }
  }

  const addColumn = async () => {
    if (!selectedTable || !newColumn || !projectId) return

    try {
      setLoading(true)
      await fetch(
        apiUrl(`/admin/projects/${projectId}/tables/${selectedTable.id}/columns`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newColumn),
        }
      )
      setNewColumn(null)
      await loadTables()
    } catch (error) {
      console.error('Error adding column:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateColumn = async () => {
    if (!selectedTable || !editingColumn || !projectId) return

    try {
      setLoading(true)
      await fetch(
        apiUrl(`/admin/projects/${projectId}/tables/${selectedTable.id}/columns/${editingColumn.oldName}`),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName: editingColumn.newName, newType: editingColumn.newType }),
        }
      )
      setEditingColumn(null)
      await loadTables()
    } catch (error) {
      console.error('Error updating column:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteColumn = async (columnName: string) => {
    if (!selectedTable || !projectId) return
    if (!confirm(`Удалить колонку ${columnName}?`)) return

    try {
      setLoading(true)
      await fetch(
        apiUrl(`/admin/projects/${projectId}/tables/${selectedTable.id}/columns/${columnName}`),
        {
          method: 'DELETE',
        }
      )
      await loadTables()
    } catch (error) {
      console.error('Error deleting column:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToJSON = () => {
    const data = JSON.stringify(rows, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTable?.name || 'data'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToCSV = () => {
    if (!selectedTable || rows.length === 0) return

    const headers = selectedTable.columns.map((c) => c.name).join(',')
    const csvRows = rows.map((row) =>
      selectedTable.columns
        .map((col) => {
          const val = row[col.name]
          if (typeof val === 'string') {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val ?? ''
        })
        .join(',')
    )

    const csv = [headers, ...csvRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTable.name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!projectId || !apiKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ошибка</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Необходимо указать projectId и apiKey в URL параметрах.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Data Browser</h1>
          </div>
          {selectedTable && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToJSON}>
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r bg-card min-h-[calc(100vh-65px)] p-4">
          <h2 className="font-semibold mb-4">Таблицы</h2>
          <nav className="space-y-1">
            {tables.map((table) => (
              <button
                key={table.id}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  selectedTable?.id === table.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => loadTableData(table)}
              >
                <TableIcon className="w-4 h-4" />
                {table.name}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {table.rows.length}
                </Badge>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {selectedTable ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedTable.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {rows.length} записей
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setNewColumn({ name: '', type: 'text' })}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить колонку
                  </Button>
                  <Button onClick={addRow}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить запись
                  </Button>
                </div>
              </div>

              {newColumn && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Новая колонка</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Название</label>
                        <Input
                          value={newColumn.name}
                          onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                          placeholder="column_name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Тип</label>
                        <select
                          className="w-full px-3 py-2 border rounded-md"
                          value={newColumn.type}
                          onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
                        >
                          <option value="text">text</option>
                          <option value="int">int</option>
                          <option value="boolean">boolean</option>
                          <option value="timestamp">timestamp</option>
                          <option value="uuid">uuid</option>
                          <option value="json">json</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={addColumn} disabled={loading}>Добавить</Button>
                      <Button variant="outline" onClick={() => setNewColumn(null)}>Отмена</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {editingRow && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Новая запись</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedTable.columns.map((col) => (
                        <div key={col.name}>
                          <label className="text-sm font-medium mb-1 block">
                            {col.name}
                            <span className="text-muted-foreground ml-1">({col.type})</span>
                          </label>
                          <Input
                            value={String(editingRow[col.name] || '')}
                            onChange={(e) =>
                              setEditingRow({ ...editingRow, [col.name]: e.target.value })
                            }
                            disabled={col.name === 'id' || col.name === 'created_at'}
                            placeholder={col.primary ? 'Auto-generated' : ''}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={saveRow} disabled={loading}>
                        Сохранить
                      </Button>
                      <Button variant="outline" onClick={() => setEditingRow(null)}>
                        Отмена
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedTable.columns.map((col) => (
                          <TableHead key={col.name}>
                            <div className="flex items-center gap-2">
                              {editingColumn?.oldName === col.name ? (
                                <>
                                  <Input
                                    className="h-8 w-24"
                                    value={editingColumn.newName}
                                    onChange={(e) => setEditingColumn({ ...editingColumn, newName: e.target.value })}
                                  />
                                  <select
                                    className="h-8 px-2 border rounded text-xs"
                                    value={editingColumn.newType}
                                    onChange={(e) => setEditingColumn({ ...editingColumn, newType: e.target.value })}
                                  >
                                    <option value="text">text</option>
                                    <option value="int">int</option>
                                    <option value="boolean">boolean</option>
                                    <option value="timestamp">timestamp</option>
                                    <option value="uuid">uuid</option>
                                    <option value="json">json</option>
                                  </select>
                                  <Button size="icon" className="h-6 w-6" onClick={updateColumn}>
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingColumn(null)}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {col.name}
                                  <span className="text-xs text-muted-foreground">({col.type})</span>
                                  {col.primary && <Badge variant="outline" className="text-xs">PK</Badge>}
                                  {!col.primary && (
                                    <>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => setEditingColumn({ oldName: col.name, newName: col.name, newType: col.type })}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={() => deleteColumn(col.name)}
                                      >
                                        <Trash2 className="w-3 h-3 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, idx) => (
                        <TableRow key={String(row.id) || idx}>
                          {selectedTable.columns.map((col) => (
                            <TableCell key={col.name} className="max-w-xs truncate">
                              {typeof row[col.name] === 'object'
                                ? JSON.stringify(row[col.name])
                                : String(row[col.name] ?? '')}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => deleteRow(row)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {rows.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={selectedTable.columns.length + 1}
                            className="text-center py-8 text-muted-foreground"
                          >
                            Нет данных
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Выберите таблицу для просмотра данных</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
