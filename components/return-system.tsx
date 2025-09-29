"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, RotateCcw, User, AlertCircle } from "lucide-react"
import { storage, addLog, sendReturnWebhook, type Asset, type BorrowRecord, type User as UserType } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface ReturnSystemProps {
  user: UserType
}

export function ReturnSystem({ user }: ReturnSystemProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [borrows, setBorrows] = useState<BorrowRecord[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchId, setSearchId] = useState("")
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowRecord | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setAssets(storage.getAssets())
    setBorrows(storage.getBorrows())
  }

  const activeBorrows = borrows.filter((borrow) => borrow.status === "Dipinjam")

  const handleSearch = () => {
    if (!searchId.trim()) {
      toast({
        title: "Error",
        description: "Harap masukkan ID peminjaman.",
        variant: "destructive",
      })
      return
    }

    const borrow = activeBorrows.find((b) => b.id.toLowerCase() === searchId.toLowerCase())
    if (borrow) {
      setSelectedBorrow(borrow)
      toast({
        title: "Data Ditemukan",
        description: `Data peminjaman untuk ${borrow.namaPegawai} berhasil ditemukan.`,
      })
    } else {
      setSelectedBorrow(null)
      toast({
        title: "Data Tidak Ditemukan",
        description: "ID peminjaman tidak ditemukan atau sudah dikembalikan.",
        variant: "destructive",
      })
    }
  }

  const handleReturn = async () => {
    if (!selectedBorrow) return

    // Update borrow record status
    const updatedBorrows = borrows.map((borrow) => {
      if (borrow.id === selectedBorrow.id) {
        return {
          ...borrow,
          status: "Dikembalikan" as const,
          tanggalKembali: new Date().toISOString().split("T")[0],
        }
      }
      return borrow
    })

    // Update asset statuses back to "Instock"
    const updatedAssets = assets.map((asset) => {
      if (selectedBorrow.assets.includes(asset.id)) {
        return { ...asset, status: "Instock" as const }
      }
      return asset
    })

    // Save to storage
    storage.setBorrows(updatedBorrows)
    storage.setAssets(updatedAssets)

    // Update local state
    setBorrows(updatedBorrows)
    setAssets(updatedAssets)

    // Log the action
    const returnedAssetNames = assets
      .filter((asset) => selectedBorrow.assets.includes(asset.id))
      .map((asset) => asset.nama)
      .join(", ")

    addLog(
      user.username,
      "Process Return",
      `Processed return for borrow ID ${selectedBorrow.id} from ${selectedBorrow.namaPegawai}. Assets returned: ${returnedAssetNames}`,
    )

    const returnedBorrow = updatedBorrows.find((b) => b.id === selectedBorrow.id)
    if (returnedBorrow) {
      try {
        await sendReturnWebhook(returnedBorrow, updatedAssets)
        addLog(user.username, "Webhook Sent", `Return webhook sent for ${selectedBorrow.id}`)
      } catch (error) {
        console.error("Failed to send return webhook:", error)
        addLog(user.username, "Webhook Failed", `Failed to send return webhook for ${selectedBorrow.id}`)
      }
    }

    toast({
      title: "Pengembalian Berhasil",
      description: `Assets dari ${selectedBorrow.namaPegawai} berhasil dikembalikan.`,
    })

    // Reset form
    setSelectedBorrow(null)
    setSearchId("")
    setIsDialogOpen(false)
  }

  const getAssetName = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId)
    return asset ? asset.nama : "Asset tidak ditemukan"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calculateReturnDate = (borrowDate: string, duration: number) => {
    const date = new Date(borrowDate)
    date.setDate(date.getDate() + duration)
    return date
  }

  const isOverdue = (borrowDate: string, duration: number) => {
    const returnDate = calculateReturnDate(borrowDate, duration)
    return new Date() > returnDate
  }

  const getDaysOverdue = (borrowDate: string, duration: number) => {
    const returnDate = calculateReturnDate(borrowDate, duration)
    const today = new Date()
    const diffTime = today.getTime() - returnDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Pengembalian Assets</h3>
          <p className="text-sm text-muted-foreground">Proses pengembalian assets dari pegawai</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <RotateCcw className="h-4 w-4 mr-2" />
              Proses Pengembalian
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Formulir Pengembalian Asset</DialogTitle>
              <DialogDescription>Masukkan ID peminjaman untuk memproses pengembalian</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Search Section */}
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="searchId">ID Peminjaman</Label>
                    <Input
                      id="searchId"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      placeholder="Masukkan ID peminjaman (contoh: BRW-1234567890)"
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch} className="mt-6">
                    <Search className="h-4 w-4 mr-2" />
                    Cari
                  </Button>
                </div>
              </div>

              {/* Borrow Details Section */}
              {selectedBorrow && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detail Peminjaman</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">ID Pegawai</Label>
                        <p className="text-sm">{selectedBorrow.idPegawai}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Nama Pegawai</Label>
                        <p className="text-sm font-medium">{selectedBorrow.namaPegawai}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Lama Dipinjam</Label>
                        <p className="text-sm">{selectedBorrow.lamaDipinjam} hari</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Tanggal Pinjam</Label>
                        <p className="text-sm">{formatDate(selectedBorrow.tanggalPinjam)}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Kebutuhan</Label>
                      <p className="text-sm">{selectedBorrow.kebutuhan}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Assets yang Dipinjam</Label>
                      <div className="mt-2 space-y-2">
                        {selectedBorrow.assets.map((assetId) => (
                          <div key={assetId} className="flex items-center space-x-2 p-2 bg-muted rounded">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{getAssetName(assetId)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={selectedBorrow.status === "Dipinjam" ? "destructive" : "default"}>
                          {selectedBorrow.status}
                        </Badge>
                        {isOverdue(selectedBorrow.tanggalPinjam, selectedBorrow.lamaDipinjam) && (
                          <div className="flex items-center space-x-1 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">
                              Terlambat {getDaysOverdue(selectedBorrow.tanggalPinjam, selectedBorrow.lamaDipinjam)} hari
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button onClick={handleReturn}>Proses Pengembalian</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Borrows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Peminjaman Aktif</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pinjam</TableHead>
                <TableHead>Pegawai</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Tanggal Pinjam</TableHead>
                <TableHead>Batas Kembali</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeBorrows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Tidak ada peminjaman aktif</p>
                  </TableCell>
                </TableRow>
              ) : (
                activeBorrows.map((borrow) => {
                  const returnDate = calculateReturnDate(borrow.tanggalPinjam, borrow.lamaDipinjam)
                  const overdue = isOverdue(borrow.tanggalPinjam, borrow.lamaDipinjam)
                  const daysOverdue = getDaysOverdue(borrow.tanggalPinjam, borrow.lamaDipinjam)

                  return (
                    <TableRow key={borrow.id} className={overdue ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-sm">{borrow.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{borrow.namaPegawai}</div>
                          <div className="text-sm text-muted-foreground">ID: {borrow.idPegawai}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {borrow.assets.slice(0, 2).map((assetId) => (
                            <div key={assetId} className="text-sm">
                              {getAssetName(assetId)}
                            </div>
                          ))}
                          {borrow.assets.length > 2 && (
                            <div className="text-sm text-muted-foreground">+{borrow.assets.length - 2} lainnya</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(borrow.tanggalPinjam)}</TableCell>
                      <TableCell>
                        <div className={overdue ? "text-destructive font-medium" : ""}>
                          {returnDate.toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                          {overdue && <div className="text-xs">Terlambat {daysOverdue} hari</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive">{borrow.status}</Badge>
                          {overdue && <AlertCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchId(borrow.id)
                            setSelectedBorrow(borrow)
                            setIsDialogOpen(true)
                          }}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Kembalikan
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recently Returned Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pengembalian Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pinjam</TableHead>
                <TableHead>Pegawai</TableHead>
                <TableHead>Tanggal Kembali</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrows
                .filter((borrow) => borrow.status === "Dikembalikan")
                .slice(0, 5)
                .map((borrow) => (
                  <TableRow key={borrow.id}>
                    <TableCell className="font-mono text-sm">{borrow.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{borrow.namaPegawai}</div>
                        <div className="text-sm text-muted-foreground">ID: {borrow.idPegawai}</div>
                      </div>
                    </TableCell>
                    <TableCell>{borrow.tanggalKembali && formatDate(borrow.tanggalKembali)}</TableCell>
                    <TableCell>
                      <Badge variant="default">{borrow.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
