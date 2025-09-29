"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Search, Filter, Download, History, Trash2 } from "lucide-react"
import { storage, type LogEntry, type User } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface HistoryLoggingProps {
  user: User
}

export function HistoryLogging({ user }: HistoryLoggingProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadLogs()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [logs, searchTerm, actionFilter, userFilter, dateFilter])

  const loadLogs = () => {
    const allLogs = storage.getLogs().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setLogs(allLogs)
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.user.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter)
    }

    // User filter
    if (userFilter !== "all") {
      filtered = filtered.filter((log) => log.user === userFilter)
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter((log) => log.timestamp.startsWith(dateFilter))
    }

    setFilteredLogs(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setActionFilter("all")
    setUserFilter("all")
    setDateFilter("")
  }

  const exportLogs = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : logs
    const csvContent = [
      ["Timestamp", "User", "Action", "Details"].join(","),
      ...logsToExport.map((log) =>
        [
          new Date(log.timestamp).toLocaleString("id-ID"),
          log.user,
          log.action,
          `"${log.details.replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cimbj-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Export Berhasil",
      description: "Log history berhasil diekspor ke file CSV.",
    })
  }

  const clearAllLogs = () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua log history? Tindakan ini tidak dapat dibatalkan.")) {
      storage.setLogs([])
      setLogs([])
      toast({
        title: "Log Dihapus",
        description: "Semua log history berhasil dihapus.",
      })
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "Login":
        return "default"
      case "Logout":
        return "secondary"
      case "Create Asset":
      case "Create Category":
      case "Create Borrow":
        return "default"
      case "Update Asset":
      case "Update Category":
        return "secondary"
      case "Delete Asset":
      case "Delete Category":
        return "destructive"
      case "Process Return":
        return "default"
      case "Export":
      case "Export SQL":
        return "secondary"
      default:
        return "outline"
    }
  }

  // Get unique actions and users for filters
  const uniqueActions = [...new Set(logs.map((log) => log.action))].sort()
  const uniqueUsers = [...new Set(logs.map((log) => log.user))].sort()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Log History</h3>
          <p className="text-sm text-muted-foreground">Riwayat semua aktivitas sistem</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {user.role === "admin" && (
            <Button variant="outline" size="sm" onClick={clearAllLogs}>
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Semua Log
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari dalam log..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionFilter">Filter Aksi</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua aksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userFilter">Filter User</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua User</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFilter">Filter Tanggal</Label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dateFilter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Menampilkan {filteredLogs.length} dari {logs.length} log
            </p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {logs.length === 0 ? "Belum ada log yang tercatat" : "Tidak ada log yang sesuai dengan filter"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">{formatTimestamp(log.timestamp)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{log.user}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm truncate" title={log.details}>
                        {log.details}
                      </p>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Statistics */}
      {logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Log</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hari Ini</p>
                  <p className="text-2xl font-bold">
                    {logs.filter((log) => log.timestamp.startsWith(new Date().toISOString().split("T")[0])).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Aksi Unik</p>
                  <p className="text-2xl font-bold">{uniqueActions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
