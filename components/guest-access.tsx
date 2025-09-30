"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { X, Search, Package, Users, ArrowLeft, CheckCircle, Copy } from "lucide-react"
import { storage, addLog, sendBorrowWebhook, sendReturnWebhook, type BorrowRecord } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface GuestAccessProps {
  onBack: () => void
}

export function GuestAccess({ onBack }: GuestAccessProps) {
  const [activeTab, setActiveTab] = useState<"borrow" | "return">("borrow")
  const { toast } = useToast()

  // Borrow form state
  const [borrowForm, setBorrowForm] = useState({
    idPegawai: "",
    namaPegawai: "",
    selectedAssets: [] as string[],
    lamaDipinjam: "",
    kebutuhan: "",
  })

  // Return form state
  const [returnForm, setReturnForm] = useState({
    borrowId: "",
    foundBorrow: null as BorrowRecord | null,
  })

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successBorrowData, setSuccessBorrowData] = useState<BorrowRecord | null>(null)

  const [searchTerm, setSearchTerm] = useState("")

  const assets = storage.getAssets()
  const borrows = storage.getBorrows()

  const availableAssets = assets.filter(
    (asset) => asset.status === "Instock" && asset.nama.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleBorrowSubmit = async (e: React.FormEvent) => {
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
        description: "Semua field harus diisi dan minimal pilih 1 asset.",
        variant: "destructive",
      })
      return
    }

    const borrowId = `BRW-${Date.now()}`
    const newBorrow: BorrowRecord = {
      id: borrowId,
      idPegawai: borrowForm.idPegawai,
      namaPegawai: borrowForm.namaPegawai,
      assets: borrowForm.selectedAssets,
      lamaDipinjam: Number.parseInt(borrowForm.lamaDipinjam),
      kebutuhan: borrowForm.kebutuhan,
      status: "Dipinjam",
      tanggalPinjam: new Date().toISOString().split("T")[0],
    }

    // Update asset status
    const updatedAssets = assets.map((asset) =>
      borrowForm.selectedAssets.includes(asset.id) ? { ...asset, status: "Dipinjam" as const } : asset,
    )

    // Save data
    const updatedBorrows = [...borrows, newBorrow]
    storage.setBorrows(updatedBorrows)
    storage.setAssets(updatedAssets)

    // Log activity
    addLog(
      "Guest",
      "Borrow",
      `Guest ${borrowForm.namaPegawai} (${borrowForm.idPegawai}) meminjam ${borrowForm.selectedAssets.length} asset(s)`,
    )

    // Send webhook
    try {
      await sendBorrowWebhook(newBorrow, updatedAssets)
      addLog("Guest", "Webhook Sent", `Borrow webhook sent for ${borrowId}`)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to send borrow webhook:", error)
      addLog("Guest", "Webhook Failed", `Failed to send borrow webhook for ${borrowId}`)
    }

    // Show success popup
    setSuccessBorrowData(newBorrow)
    setShowSuccessPopup(true)

    // Reset form
    setBorrowForm({
      idPegawai: "",
      namaPegawai: "",
      selectedAssets: [],
      lamaDipinjam: "",
      kebutuhan: "",
    })
    setSearchTerm("")
  }

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!returnForm.foundBorrow) {
      toast({
        title: "Error",
        description: "ID Peminjaman tidak ditemukan.",
        variant: "destructive",
      })
      return
    }

    // Update borrow status
    const updatedBorrows = borrows.map((borrow) =>
      borrow.id === returnForm.borrowId
        ? { ...borrow, status: "Dikembalikan" as const, tanggalKembali: new Date().toISOString().split("T")[0] }
        : borrow,
    )

    // Update asset status back to Instock
    const updatedAssets = assets.map((asset) =>
      returnForm.foundBorrow!.assets.includes(asset.id) ? { ...asset, status: "Instock" as const } : asset,
    )

    storage.setBorrows(updatedBorrows)
    storage.setAssets(updatedAssets)

    // Log activity
    addLog("Guest", "Return", `Guest mengembalikan peminjaman ${returnForm.borrowId}`)

    // Find updated borrow record
    const returnedBorrow = updatedBorrows.find((b) => b.id === returnForm.borrowId)

    // Send webhook
    if (returnedBorrow) {
      try {
        await sendReturnWebhook(returnedBorrow, updatedAssets)
        addLog("Guest", "Webhook Sent", `Return webhook sent for ${returnForm.borrowId}`)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to send return webhook:", error)
        addLog("Guest", "Webhook Failed", `Failed to send return webhook for ${returnForm.borrowId}`)
      }
    }

    toast({
      title: "Pengembalian Berhasil",
      description: `Peminjaman ${returnForm.borrowId} telah dikembalikan.`,
    })

    // Reset form
    setReturnForm({
      borrowId: "",
      foundBorrow: null,
    })
  }

  const searchBorrow = () => {
    const found = borrows.find((borrow) => borrow.id === returnForm.borrowId && borrow.status === "Dipinjam")
    setReturnForm((prev) => ({ ...prev, foundBorrow: found || null }))

    if (!found) {
      toast({
        title: "Tidak Ditemukan",
        description: "ID Peminjaman tidak ditemukan atau sudah dikembalikan.",
        variant: "destructive",
      })
    }
  }

  const addAssetToBorrow = (assetId: string) => {
    if (!borrowForm.selectedAssets.includes(assetId)) {
      setBorrowForm((prev) => ({
        ...prev,
        selectedAssets: [...prev.selectedAssets, assetId],
      }))
    }
  }

  const removeAssetFromBorrow = (assetId: string) => {
    setBorrowForm((prev) => ({
      ...prev,
      selectedAssets: prev.selectedAssets.filter((id) => id !== assetId),
    }))
  }

  const getAssetById = (id: string) => assets.find((asset) => asset.id === id)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Berhasil",
        description: "ID Peminjaman berhasil disalin ke clipboard",
      })
    }).catch(() => {
      toast({
        title: "Error",
        description: "Gagal menyalin ke clipboard",
        variant: "destructive",
      })
    })
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <h1 className="text-xl font-bold">CIMBJ - Guest Access</h1>
            <span className="text-sm text-muted-foreground">Akses Tamu</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="flex space-x-8 px-6">
          {[
            { id: "borrow", label: "Pinjam Asset", icon: Package },
            { id: "return", label: "Kembalikan Asset", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "borrow" | "return")}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="p-6">
        {activeTab === "borrow" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Borrow Form */}
            <Card>
              <CardHeader>
                <CardTitle>Form Peminjaman Asset</CardTitle>
                <CardDescription>Isi form untuk meminjam asset</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBorrowSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="idPegawai">ID Pegawai</Label>
                      <Input
                        id="idPegawai"
                        value={borrowForm.idPegawai}
                        onChange={(e) => setBorrowForm((prev) => ({ ...prev, idPegawai: e.target.value }))}
                        placeholder="Masukkan ID Pegawai"
                      />
                    </div>
                    <div>
                      <Label htmlFor="namaPegawai">Nama Pegawai</Label>
                      <Input
                        id="namaPegawai"
                        value={borrowForm.namaPegawai}
                        onChange={(e) => setBorrowForm((prev) => ({ ...prev, namaPegawai: e.target.value }))}
                        placeholder="Masukkan Nama Pegawai"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lamaDipinjam">Lama Dipinjam (hari)</Label>
                      <Input
                        id="lamaDipinjam"
                        type="number"
                        min="1"
                        value={borrowForm.lamaDipinjam}
                        onChange={(e) => setBorrowForm((prev) => ({ ...prev, lamaDipinjam: e.target.value }))}
                        placeholder="Jumlah hari"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="kebutuhan">Kebutuhan/Tujuan</Label>
                    <Textarea
                      id="kebutuhan"
                      value={borrowForm.kebutuhan}
                      onChange={(e) => setBorrowForm((prev) => ({ ...prev, kebutuhan: e.target.value }))}
                      placeholder="Jelaskan kebutuhan atau tujuan peminjaman"
                    />
                  </div>

                  {/* Selected Assets */}
                  {borrowForm.selectedAssets.length > 0 && (
                    <div>
                      <Label>Asset yang Dipilih ({borrowForm.selectedAssets.length})</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {borrowForm.selectedAssets.map((assetId) => {
                          const asset = getAssetById(assetId)
                          return asset ? (
                            <Badge key={assetId} variant="secondary" className="flex items-center gap-1">
                              {asset.nama}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => removeAssetFromBorrow(assetId)} />
                            </Badge>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full">
                    Ajukan Peminjaman
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Asset Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Pilih Asset</CardTitle>
                <CardDescription>Klik asset untuk menambahkan ke peminjaman</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari asset..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {availableAssets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => addAssetToBorrow(asset.id)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          borrowForm.selectedAssets.includes(asset.id)
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{asset.nama}</h4>
                            <p className="text-sm text-muted-foreground">{asset.kategori}</p>
                            <p className="text-sm">Qty: {asset.qty}</p>
                          </div>
                          <Badge variant="outline">{asset.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "return" && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Form Pengembalian Asset</CardTitle>
                <CardDescription>Masukkan ID Peminjaman untuk mengembalikan asset</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReturnSubmit} className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Masukkan ID Peminjaman (BRW-...)"
                      value={returnForm.borrowId}
                      onChange={(e) => setReturnForm((prev) => ({ ...prev, borrowId: e.target.value }))}
                    />
                    <Button type="button" onClick={searchBorrow}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  {returnForm.foundBorrow && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <h4 className="font-medium mb-2">Detail Peminjaman</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">ID Pegawai:</span>
                          <p>{returnForm.foundBorrow.idPegawai}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Nama Pegawai:</span>
                          <p>{returnForm.foundBorrow.namaPegawai}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tanggal Pinjam:</span>
                          <p>{new Date(returnForm.foundBorrow.tanggalPinjam).toLocaleDateString("id-ID")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lama Pinjam:</span>
                          <p>{returnForm.foundBorrow.lamaDipinjam} hari</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-muted-foreground">Asset yang Dipinjam:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {returnForm.foundBorrow.assets.map((assetId) => {
                            const asset = getAssetById(assetId)
                            return asset ? (
                              <Badge key={assetId} variant="outline">
                                {asset.nama}
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-muted-foreground">Kebutuhan:</span>
                        <p className="text-sm">{returnForm.foundBorrow.kebutuhan}</p>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={!returnForm.foundBorrow}>
                    Kembalikan Asset
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Success Popup */}
      {showSuccessPopup && successBorrowData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-center text-green-600 mb-2">
                Peminjaman Berhasil!
              </h2>
              
              <p className="text-center text-gray-600 mb-6">
                Asset berhasil dipinjamkan. Simpan ID Peminjaman untuk pengembalian.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">ID Peminjaman:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(successBorrowData.id)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Salin
                    </Button>
                  </div>
                  <p className="font-mono text-lg text-gray-900">{successBorrowData.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nama Pegawai:</span>
                    <p className="font-medium">{successBorrowData.namaPegawai}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ID Pegawai:</span>
                    <p className="font-medium">{successBorrowData.idPegawai}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tanggal Pinjam:</span>
                    <p className="font-medium">{formatDate(successBorrowData.tanggalPinjam)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tanggal Kembali:</span>
                    <p className="font-medium">{calculateReturnDate(successBorrowData.tanggalPinjam, successBorrowData.lamaDipinjam)}</p>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 text-sm">Asset yang Dipinjam:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {successBorrowData.assets.map((assetId) => {
                      const asset = getAssetById(assetId)
                      return asset ? (
                        <Badge key={assetId} variant="secondary">
                          {asset.nama}
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 text-sm">Kebutuhan:</span>
                  <p className="text-sm mt-1">{successBorrowData.kebutuhan}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSuccessPopup(false)}
                >
                  Tutup
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowSuccessPopup(false)
                    setActiveTab("return")
                  }}
                >
                  Kembalikan Asset
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
