"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Package, Camera } from "lucide-react"
import { storage, addLog, generateId, type Asset, type Category, type User } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface AssetManagementProps {
  user: User
}

export function AssetManagement({ user }: AssetManagementProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const { toast } = useToast()

  // Asset form state
  const [assetForm, setAssetForm] = useState({
    nama: "",
    sku: "",
    deskripsi: "",
    kategori: "",
    nilai: "",
    qty: "",
  })

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    nama: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setAssets(storage.getAssets())
    setCategories(storage.getCategories())
  }

  const resetAssetForm = () => {
    setAssetForm({
      nama: "",
      sku: "",
      deskripsi: "",
      kategori: "",
      nilai: "",
      qty: "",
    })
    setEditingAsset(null)
  }

  const resetCategoryForm = () => {
    setCategoryForm({ nama: "" })
    setEditingCategory(null)
  }

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!assetForm.nama || !assetForm.kategori || !assetForm.nilai || !assetForm.qty) {
      toast({
        title: "Error",
        description: "Harap isi semua field yang wajib.",
        variant: "destructive",
      })
      return
    }

    const assetData: Asset = {
      id: editingAsset?.id || generateId(),
      nama: assetForm.nama,
      sku: assetForm.sku || undefined,
      deskripsi: assetForm.deskripsi || undefined,
      kategori: assetForm.kategori,
      nilai: Number.parseFloat(assetForm.nilai),
      qty: Number.parseInt(assetForm.qty),
      status: editingAsset?.status || "Instock",
    }

    const currentAssets = storage.getAssets()
    let updatedAssets: Asset[]

    if (editingAsset) {
      updatedAssets = currentAssets.map((asset) => (asset.id === editingAsset.id ? assetData : asset))
      addLog(user.username, "Update Asset", `Updated asset: ${assetData.nama}`)
      toast({
        title: "Asset Diperbarui",
        description: `Asset ${assetData.nama} berhasil diperbarui.`,
      })
    } else {
      updatedAssets = [...currentAssets, assetData]
      addLog(user.username, "Create Asset", `Created new asset: ${assetData.nama}`)
      toast({
        title: "Asset Ditambahkan",
        description: `Asset ${assetData.nama} berhasil ditambahkan.`,
      })
    }

    storage.setAssets(updatedAssets)
    setAssets(updatedAssets)
    setIsAssetDialogOpen(false)
    resetAssetForm()
  }

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryForm.nama) {
      toast({
        title: "Error",
        description: "Nama kategori harus diisi.",
        variant: "destructive",
      })
      return
    }

    const categoryData: Category = {
      id: editingCategory?.id || generateId(),
      nama: categoryForm.nama,
    }

    const currentCategories = storage.getCategories()
    let updatedCategories: Category[]

    if (editingCategory) {
      updatedCategories = currentCategories.map((cat) => (cat.id === editingCategory.id ? categoryData : cat))
      addLog(user.username, "Update Category", `Updated category: ${categoryData.nama}`)
      toast({
        title: "Kategori Diperbarui",
        description: `Kategori ${categoryData.nama} berhasil diperbarui.`,
      })
    } else {
      updatedCategories = [...currentCategories, categoryData]
      addLog(user.username, "Create Category", `Created new category: ${categoryData.nama}`)
      toast({
        title: "Kategori Ditambahkan",
        description: `Kategori ${categoryData.nama} berhasil ditambahkan.`,
      })
    }

    storage.setCategories(updatedCategories)
    setCategories(updatedCategories)
    setIsCategoryDialogOpen(false)
    resetCategoryForm()
  }

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset)
    setAssetForm({
      nama: asset.nama,
      sku: asset.sku || "",
      deskripsi: asset.deskripsi || "",
      kategori: asset.kategori,
      nilai: asset.nilai.toString(),
      qty: asset.qty.toString(),
    })
    setIsAssetDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({ nama: category.nama })
    setIsCategoryDialogOpen(true)
  }

  const handleDeleteAsset = (asset: Asset) => {
    if (confirm(`Apakah Anda yakin ingin menghapus asset "${asset.nama}"?`)) {
      const updatedAssets = assets.filter((a) => a.id !== asset.id)
      storage.setAssets(updatedAssets)
      setAssets(updatedAssets)
      addLog(user.username, "Delete Asset", `Deleted asset: ${asset.nama}`)
      toast({
        title: "Asset Dihapus",
        description: `Asset ${asset.nama} berhasil dihapus.`,
      })
    }
  }

  const handleDeleteCategory = (category: Category) => {
    // Check if category is being used by any assets
    const assetsUsingCategory = assets.filter((asset) => asset.kategori === category.nama)
    if (assetsUsingCategory.length > 0) {
      toast({
        title: "Tidak Dapat Menghapus",
        description: `Kategori "${category.nama}" masih digunakan oleh ${assetsUsingCategory.length} asset.`,
        variant: "destructive",
      })
      return
    }

    if (confirm(`Apakah Anda yakin ingin menghapus kategori "${category.nama}"?`)) {
      const updatedCategories = categories.filter((c) => c.id !== category.id)
      storage.setCategories(updatedCategories)
      setCategories(updatedCategories)
      addLog(user.username, "Delete Category", `Deleted category: ${category.nama}`)
      toast({
        title: "Kategori Dihapus",
        description: `Kategori ${category.nama} berhasil dihapus.`,
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(value)
  }

  const generateUniqueSku = () => {
    const currentAssets = storage.getAssets()
    let sku = ""
    do {
      const randomPart = Math.random().toString(36).toUpperCase().slice(2, 8)
      sku = `SKU-${randomPart}`
    } while (currentAssets.some((a) => (a.sku || "") === sku))

    setAssetForm((prev) => ({ ...prev, sku }))
    toast({ title: "SKU Dibuat", description: `SKU: ${sku}` })
  }

  // Barcode validation helpers for linear barcodes (EAN-13, EAN-8, UPC-A)
  const calculateEAN13CheckDigit = (num12: string) => {
    const digits = num12.split("").map((d) => Number(d))
    const sum = digits.reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 1 : 3), 0)
    const mod = sum % 10
    return mod === 0 ? 0 : 10 - mod
  }

  const validateEAN13 = (value: string) => {
    if (!/^\d{13}$/.test(value)) return false
    const check = Number(value[12])
    const calc = calculateEAN13CheckDigit(value.slice(0, 12))
    return check === calc
  }

  const validateEAN8 = (value: string) => {
    if (!/^\d{8}$/.test(value)) return false
    const digits = value.split("").map((d) => Number(d))
    const sum = digits.slice(0, 7).reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 3 : 1), 0)
    const check = (10 - (sum % 10)) % 10
    return check === digits[7]
  }

  const validateUPCA = (value: string) => {
    if (!/^\d{12}$/.test(value)) return false
    const digits = value.split("").map((d) => Number(d))
    const sumOdd = digits.slice(0, 11).reduce((acc, d, idx) => acc + (idx % 2 === 0 ? d : 0), 0)
    const sumEven = digits.slice(0, 11).reduce((acc, d, idx) => acc + (idx % 2 === 1 ? d : 0), 0)
    const total = sumOdd * 3 + sumEven
    const check = (10 - (total % 10)) % 10
    return check === digits[11]
  }

  const tryAcceptBarcode = (raw: string): boolean => {
    const trimmed = String(raw).trim()
    // Only accept numeric linear barcodes
    if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(trimmed)) {
      toast({ title: "Barcode Tidak Valid", description: "Hanya menerima barcode batang numerik (EAN-8/UPC-A/EAN-13)", variant: "destructive" })
      return false
    }
    const ok = trimmed.length === 13 ? validateEAN13(trimmed) : trimmed.length === 8 ? validateEAN8(trimmed) : validateUPCA(trimmed)
    if (!ok) {
      toast({ title: "Barcode Gagal Diverifikasi", description: "Checksum barcode tidak sesuai. Coba scan ulang.", variant: "destructive" })
      return false
    }
    setAssetForm((prev) => ({ ...prev, sku: trimmed }))
    toast({ title: "Barcode Terdeteksi", description: `SKU: ${trimmed}` })
    return true
  }

  const startBarcodeScan = async () => {
    try {
      setIsScanning(true)
      
      // Check if the browser supports camera access
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Error",
          description: "Browser tidak mendukung akses kamera untuk scan barcode.",
          variant: "destructive",
        })
        return
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Use back camera if available
        } 
      })

      // Create a video element for camera preview
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      // Create a canvas for capturing frames
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // Create a modal for camera preview
      const modal = document.createElement('div')
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `

      const videoContainer = document.createElement('div')
      videoContainer.style.cssText = `
        position: relative;
        width: 80%;
        max-width: 500px;
        background: white;
        border-radius: 8px;
        overflow: hidden;
      `

      const closeBtn = document.createElement('button')
      closeBtn.innerHTML = '✕'
      closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        z-index: 10000;
      `

      const instruction = document.createElement('div')
      instruction.innerHTML = 'Arahkan kamera ke barcode untuk scan'
      instruction.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
      `

      videoContainer.appendChild(video)
      videoContainer.appendChild(closeBtn)
      videoContainer.appendChild(instruction)
      modal.appendChild(videoContainer)
      document.body.appendChild(modal)

      // Handle close button
      const closeModal = () => {
        stream.getTracks().forEach(track => track.stop())
        document.body.removeChild(modal)
        setIsScanning(false)
      }

      closeBtn.onclick = closeModal
      modal.onclick = (e) => {
        if (e.target === modal) closeModal()
      }

      // Barcode detection using BarcodeDetector when available
      let detected = false
      let scanInterval: number | undefined

      const fallbackSimulate = () => {
        // Fallback: simulate after 3s if no BarcodeDetector
        window.setTimeout(() => {
          if (detected) return
          if (scanInterval) window.clearInterval(scanInterval)
          detected = true
          closeModal()
          // Generate valid EAN-13 for simulation
          const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("")
          const check = calculateEAN13CheckDigit(base)
          const simulated = `${base}${check}`
          setAssetForm((prev) => ({ ...prev, sku: simulated }))
          toast({ title: "Barcode Disimulasikan", description: `SKU: ${simulated}` })
        }, 3000)
      }

      // @ts-expect-error: BarcodeDetector may not exist in TS lib
      const HasBarcodeDetector = typeof window !== "undefined" && window.BarcodeDetector
      // @ts-expect-error: BarcodeDetector may not exist in TS lib
      const Supported = HasBarcodeDetector && (await window.BarcodeDetector.getSupportedFormats?.())

      if (HasBarcodeDetector && Supported && Supported.length) {
        // @ts-expect-error: BarcodeDetector type
        const detector = new window.BarcodeDetector({ formats: [
          "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "qr_code"
        ] })

        scanInterval = window.setInterval(async () => {
          if (detected) return
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            try {
              const results = await detector.detect(video as unknown as CanvasImageSource)
              if (results && results.length > 0) {
                const raw = results[0].rawValue || results[0].raw || ""
                const accepted = tryAcceptBarcode(String(raw))
                if (accepted) {
                  detected = true
                  if (scanInterval) window.clearInterval(scanInterval)
                  closeModal()
                }
              }
            } catch {
              // ignore per frame errors
            }
          }
        }, 150)

        // Also set a safety fallback in case no detection occurs
        fallbackSimulate()
      } else {
        // Fallback path when BarcodeDetector is not available
        fallbackSimulate()
      }

    } catch (error) {
      setIsScanning(false)
      toast({
        title: "Error",
        description: "Gagal mengakses kamera. Pastikan izin kamera telah diberikan.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Daftar Assets</h3>
              <p className="text-sm text-muted-foreground">Kelola semua assets perusahaan</p>
            </div>
            <Dialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetAssetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingAsset ? "Edit Asset" : "Tambah Asset Baru"}</DialogTitle>
                  <DialogDescription>
                    {editingAsset ? "Perbarui informasi asset" : "Masukkan informasi asset baru"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAssetSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama">Nama Asset *</Label>
                    <Input
                      id="nama"
                      value={assetForm.nama}
                      onChange={(e) => setAssetForm({ ...assetForm, nama: e.target.value })}
                      placeholder="Masukkan nama asset"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sku"
                        value={assetForm.sku}
                        onChange={(e) => setAssetForm({ ...assetForm, sku: e.target.value })}
                        placeholder="Masukkan SKU atau scan barcode"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateUniqueSku}
                        className="px-3"
                        title="Generate SKU"
                      >
                        Generate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startBarcodeScan}
                        disabled={isScanning}
                        className="px-3"
                        title="Scan Barcode"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
                    <Textarea
                      id="deskripsi"
                      value={assetForm.deskripsi}
                      onChange={(e) => setAssetForm({ ...assetForm, deskripsi: e.target.value })}
                      placeholder="Masukkan deskripsi asset"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kategori">Kategori *</Label>
                    <Select
                      value={assetForm.kategori}
                      onValueChange={(value) => setAssetForm({ ...assetForm, kategori: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.nama}>
                            {category.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nilai">Nilai (IDR) *</Label>
                      <Input
                        id="nilai"
                        type="number"
                        value={assetForm.nilai}
                        onChange={(e) => setAssetForm({ ...assetForm, nilai: e.target.value })}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qty">Quantity *</Label>
                      <Input
                        id="qty"
                        type="number"
                        value={assetForm.qty}
                        onChange={(e) => setAssetForm({ ...assetForm, qty: e.target.value })}
                        placeholder="0"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAssetDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit">{editingAsset ? "Perbarui" : "Tambah"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Asset</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Nilai</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">Belum ada asset yang ditambahkan</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.nama}</TableCell>
                        <TableCell>{asset.sku || "-"}</TableCell>
                        <TableCell>{asset.kategori}</TableCell>
                        <TableCell>{formatCurrency(asset.nilai)}</TableCell>
                        <TableCell>{asset.qty}</TableCell>
                        <TableCell>
                          <Badge variant={asset.status === "Instock" ? "default" : "secondary"}>{asset.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditAsset(asset)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteAsset(asset)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Kategori Assets</h3>
              <p className="text-sm text-muted-foreground">Kelola kategori untuk mengorganisir assets</p>
            </div>
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetCategoryForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Kategori
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
                  <DialogDescription>
                    {editingCategory ? "Perbarui nama kategori" : "Masukkan nama kategori baru"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">Nama Kategori</Label>
                    <Input
                      id="categoryName"
                      value={categoryForm.nama}
                      onChange={(e) => setCategoryForm({ nama: e.target.value })}
                      placeholder="Masukkan nama kategori"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit">{editingCategory ? "Perbarui" : "Tambah"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Kategori</TableHead>
                    <TableHead>Nama Kategori</TableHead>
                    <TableHead>Jumlah Assets</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">Belum ada kategori yang ditambahkan</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => {
                      const assetCount = assets.filter((asset) => asset.kategori === category.nama).length
                      return (
                        <TableRow key={category.id}>
                          <TableCell className="font-mono text-sm">{category.id}</TableCell>
                          <TableCell className="font-medium">{category.nama}</TableCell>
                          <TableCell>{assetCount} assets</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteCategory(category)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
