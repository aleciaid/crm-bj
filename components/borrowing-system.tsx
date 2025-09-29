"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, User, Package } from "lucide-react"
import { storage, addLog, sendBorrowWebhook, type Asset, type BorrowRecord, type User as UserType } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface BorrowingSystemProps {
  user: UserType
}

export function BorrowingSystem({ user }: BorrowingSystemProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [borrows, setBorrows] = useState<BorrowRecord[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Form state
  const [borrowForm, setBorrowForm] = useState({
    idPegawai: "",
    namaPegawai: "",
    selectedAssets: [] as string[],
    lamaDipinjam: "",
    kebutuhan: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setAssets(storage.getAssets())
    setBorrows(storage.getBorrows())
  }

  const resetForm = () => {
    setBorrowForm({
      idPegawai: "",
      namaPegawai: "",
      selectedAssets: [],
      lamaDipinjam: "",
      kebutuhan: "",
    })
  }

  const availableAssets = assets.filter((asset) => asset.status === "Instock" && asset.qty > 0)

  const handleAssetSelection = (assetId: string, checked: boolean) => {
    if (checked) {
      setBorrowForm({
        ...borrowForm,
        selectedAssets: [...borrowForm.selectedAssets, assetId],
      })
    } else {
      setBorrowForm({
        ...borrowForm,
        selectedAssets: borrowForm.selectedAssets.filter((id) => id !== assetId),
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !borrowForm.idPegawai ||
      !borrowForm.namaPegawai ||
      borrowForm.selectedAssets.length === 0 ||
      !borrowForm.lamaDipinjam ||
      !borrowForm.kebutuhan
    ) {
      toast({
        title: "Error",
        description: "Harap isi semua field yang diperlukan.",
        variant: "destructive",
      })
      return
    }

    // Generate auto ID for borrow record
    const borrowId = `BRW-${Date.now()}`

    // Create borrow record
    const borrowRecord: BorrowRecord = {
      id: borrowId,
      idPegawai: borrowForm.idPegawai,
      namaPegawai: borrowForm.namaPegawai,
      assets: borrowForm.selectedAssets,
      lamaDipinjam: Number.parseInt(borrowForm.lamaDipinjam),
      kebutuhan: borrowForm.kebutuhan,
      status: "Dipinjam",
      tanggalPinjam: new Date().toISOString().split("T")[0],
    }

    // Update asset statuses to "Dipinjam"
    const updatedAssets = assets.map((asset) => {
      if (borrowForm.selectedAssets.includes(asset.id)) {
        return { ...asset, status: "Dipinjam" as const }
      }
      return asset
    })

    // Save to storage
    const currentBorrows = storage.getBorrows()
    const updatedBorrows = [...currentBorrows, borrowRecord]

    storage.setBorrows(updatedBorrows)
    storage.setAssets(updatedAssets)

    // Update local state
    setBorrows(updatedBorrows)
    setAssets(updatedAssets)

    // Log the action
    const selectedAssetNames = assets
      .filter((asset) => borrowForm.selectedAssets.includes(asset.id))
      .map((asset) => asset.nama)
      .join(", ")

    addLog(
      user.username,
      "Create Borrow",
      `Created borrow record ${borrowId} for ${borrowForm.namaPegawai} with assets: ${selectedAssetNames}`,
    )

    try {
      await sendBorrowWebhook(borrowRecord, updatedAssets)
      addLog(user.username, "Webhook Sent", `Borrow webhook sent for ${borrowId}`)
    } catch (error) {
      console.error("Failed to send borrow webhook:", error)
      addLog(user.username, "Webhook Failed", `Failed to send borrow webhook for ${borrowId}`)
    }

    toast({
      title: "Peminjaman Berhasil",
      description: `ID Peminjaman: ${borrowId}. Assets berhasil dipinjamkan kepada ${borrowForm.namaPegawai}.`,
    })

    setIsDialogOpen(false)
    resetForm()
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
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Peminjaman Assets</h3>
          <p className="text-sm text-muted-foreground">Kelola peminjaman assets kepada pegawai</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Pinjam Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Formulir Peminjaman Asset</DialogTitle>
              <DialogDescription>Isi informasi peminjaman dan pilih assets yang akan dipinjam</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idPegawai">ID Pegawai *</Label>
                  <Input
                    id="idPegawai"
                    value={borrowForm.idPegawai}
                    onChange={(e) => setBorrowForm({ ...borrowForm, idPegawai: e.target.value })}
                    placeholder="Masukkan ID pegawai"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="namaPegawai">Nama Pegawai *</Label>
                  <Input
                    id="namaPegawai"
                    value={borrowForm.namaPegawai}
                    onChange={(e) => setBorrowForm({ ...borrowForm, namaPegawai: e.target.value })}
                    placeholder="Masukkan nama pegawai"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lamaDipinjam">Lama Dipinjam (hari) *</Label>
                <Input
                  id="lamaDipinjam"
                  type="number"
                  value={borrowForm.lamaDipinjam}
                  onChange={(e) => setBorrowForm({ ...borrowForm, lamaDipinjam: e.target.value })}
                  placeholder="Masukkan lama peminjaman dalam hari"
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kebutuhan">Kebutuhan *</Label>
                <Textarea
                  id="kebutuhan"
                  value={borrowForm.kebutuhan}
                  onChange={(e) => setBorrowForm({ ...borrowForm, kebutuhan: e.target.value })}
                  placeholder="Jelaskan kebutuhan peminjaman asset"
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Pilih Assets yang Akan Dipinjam *</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  {availableAssets.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Tidak ada asset yang tersedia untuk dipinjam</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableAssets.map((asset) => (
                        <div key={asset.id} className="flex items-center space-x-3 p-2 hover:bg-muted rounded">
                          <Checkbox
                            id={asset.id}
                            checked={borrowForm.selectedAssets.includes(asset.id)}
                            onCheckedChange={(checked) => handleAssetSelection(asset.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={asset.id} className="cursor-pointer">
                              <div className="font-medium">{asset.nama}</div>
                              <div className="text-sm text-muted-foreground">
                                {asset.sku && `SKU: ${asset.sku} • `}
                                Kategori: {asset.kategori} • Qty: {asset.qty}
                              </div>
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {borrowForm.selectedAssets.length > 0 && (
                  <p className="text-sm text-muted-foreground">{borrowForm.selectedAssets.length} asset(s) dipilih</p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={borrowForm.selectedAssets.length === 0}>
                  Proses Peminjaman
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                <TableHead>Lama Pinjam</TableHead>
                <TableHead>Tanggal Pinjam</TableHead>
                <TableHead>Tanggal Kembali</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {borrows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Belum ada peminjaman yang tercatat</p>
                  </TableCell>
                </TableRow>
              ) : (
                borrows.map((borrow) => (
                  <TableRow key={borrow.id}>
                    <TableCell className="font-mono text-sm">{borrow.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{borrow.namaPegawai}</div>
                        <div className="text-sm text-muted-foreground">ID: {borrow.idPegawai}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {borrow.assets.map((assetId) => (
                          <div key={assetId} className="text-sm">
                            {getAssetName(assetId)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{borrow.lamaDipinjam} hari</TableCell>
                    <TableCell>{formatDate(borrow.tanggalPinjam)}</TableCell>
                    <TableCell>{calculateReturnDate(borrow.tanggalPinjam, borrow.lamaDipinjam)}</TableCell>
                    <TableCell>
                      <Badge variant={borrow.status === "Dipinjam" ? "destructive" : "default"}>{borrow.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
