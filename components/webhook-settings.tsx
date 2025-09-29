"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Webhook, Save, TestTube, CheckCircle, XCircle } from "lucide-react"
import { storage, addLog, type User, type WebhookConfig } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface WebhookSettingsProps {
  user: User
}

export function WebhookSettings({ user }: WebhookSettingsProps) {
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    borrowWebhook: "",
    returnWebhook: "",
  })
  const [isTestingBorrow, setIsTestingBorrow] = useState(false)
  const [isTestingReturn, setIsTestingReturn] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadWebhookConfig()
  }, [])

  const loadWebhookConfig = () => {
    const config = storage.getWebhookConfig()
    setWebhookConfig(config)
  }

  const handleSave = () => {
    storage.setWebhookConfig(webhookConfig)

    addLog(
      user.username,
      "Update Webhook",
      `Updated webhook configuration - Borrow: ${webhookConfig.borrowWebhook ? "Set" : "Empty"}, Return: ${webhookConfig.returnWebhook ? "Set" : "Empty"}`,
    )

    toast({
      title: "Webhook Tersimpan",
      description: "Konfigurasi webhook berhasil disimpan.",
    })
  }

  const testWebhook = async (type: "borrow" | "return", url: string) => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "URL webhook tidak boleh kosong.",
        variant: "destructive",
      })
      return
    }

    const setTesting = type === "borrow" ? setIsTestingBorrow : setIsTestingReturn
    setTesting(true)

    try {
      const testPayload = {
        type: `test_${type}`,
        timestamp: new Date().toISOString(),
        message: `Test webhook untuk ${type === "borrow" ? "peminjaman" : "pengembalian"} dari CIMBJ Inventory System`,
        testData:
          type === "borrow"
            ? {
                borrowId: "BRW-TEST123",
                employeeId: "EMP001",
                employeeName: "Test Employee",
                totalAssets: 2,
                duration: 7,
                purpose: "Testing webhook integration",
                borrowDate: new Date().toISOString().split("T")[0],
              }
            : {
                borrowId: "BRW-TEST123",
                employeeId: "EMP001",
                employeeName: "Test Employee",
                totalAssets: 2,
                borrowDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                returnDate: new Date().toISOString().split("T")[0],
                duration: 7,
                actualDuration: 7,
              },
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      })

      if (response.ok) {
        toast({
          title: "Test Berhasil",
          description: `Webhook ${type === "borrow" ? "peminjaman" : "pengembalian"} berhasil ditest.`,
        })

        addLog(user.username, "Test Webhook", `Successfully tested ${type} webhook: ${url}`)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      toast({
        title: "Test Gagal",
        description: `Webhook test gagal: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })

      addLog(
        user.username,
        "Test Webhook Failed",
        `Failed to test ${type} webhook: ${url} - ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    } finally {
      setTesting(false)
    }
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Konfigurasi Webhook</h3>
        <p className="text-sm text-muted-foreground">Atur webhook untuk integrasi dengan sistem eksternal (n8n)</p>
      </div>

      <div className="grid gap-6">
        {/* Borrow Webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Webhook className="h-5 w-5" />
              <span>Webhook Peminjaman</span>
              {webhookConfig.borrowWebhook && isValidUrl(webhookConfig.borrowWebhook) && (
                <Badge variant="secondary" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aktif
                </Badge>
              )}
              {webhookConfig.borrowWebhook && !isValidUrl(webhookConfig.borrowWebhook) && (
                <Badge variant="destructive" className="ml-2">
                  <XCircle className="h-3 w-3 mr-1" />
                  URL Invalid
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="borrowWebhook">URL Webhook</Label>
              <Input
                id="borrowWebhook"
                value={webhookConfig.borrowWebhook}
                onChange={(e) => setWebhookConfig({ ...webhookConfig, borrowWebhook: e.target.value })}
                placeholder="https://your-n8n-instance.com/webhook/borrow"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Webhook ini akan dipanggil setiap kali ada peminjaman asset baru
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testWebhook("borrow", webhookConfig.borrowWebhook)}
                disabled={!webhookConfig.borrowWebhook || isTestingBorrow}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTestingBorrow ? "Testing..." : "Test Webhook"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Return Webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Webhook className="h-5 w-5" />
              <span>Webhook Pengembalian</span>
              {webhookConfig.returnWebhook && isValidUrl(webhookConfig.returnWebhook) && (
                <Badge variant="secondary" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Aktif
                </Badge>
              )}
              {webhookConfig.returnWebhook && !isValidUrl(webhookConfig.returnWebhook) && (
                <Badge variant="destructive" className="ml-2">
                  <XCircle className="h-3 w-3 mr-1" />
                  URL Invalid
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="returnWebhook">URL Webhook</Label>
              <Input
                id="returnWebhook"
                value={webhookConfig.returnWebhook}
                onChange={(e) => setWebhookConfig({ ...webhookConfig, returnWebhook: e.target.value })}
                placeholder="https://your-n8n-instance.com/webhook/return"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Webhook ini akan dipanggil setiap kali ada pengembalian asset
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testWebhook("return", webhookConfig.returnWebhook)}
                disabled={!webhookConfig.returnWebhook || isTestingReturn}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTestingReturn ? "Testing..." : "Test Webhook"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Data Structure Info */}
        <Card>
          <CardHeader>
            <CardTitle>Struktur Data Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Data Peminjaman:</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {`{
  "type": "borrow",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "borrowRecord": {
    "id": "BRW-1234567890",
    "idPegawai": "EMP001",
    "namaPegawai": "John Doe",
    "assets": ["asset-id-1", "asset-id-2"],
    "lamaDipinjam": 7,
    "kebutuhan": "Project work",
    "status": "Dipinjam",
    "tanggalPinjam": "2024-01-01"
  },
  "assets": [
    {
      "id": "asset-id-1",
      "nama": "Laptop Dell",
      "sku": "LT001",
      "kategori": "Electronics",
      "nilai": 15000000,
      "qty": 1,
      "status": "Dipinjam"
    }
  ],
  "summary": {
    "borrowId": "BRW-1234567890",
    "employeeId": "EMP001",
    "employeeName": "John Doe",
    "totalAssets": 2,
    "duration": 7,
    "purpose": "Project work",
    "borrowDate": "2024-01-01"
  }
}`}
              </pre>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Data Pengembalian:</h4>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                {`{
  "type": "return",
  "timestamp": "2024-01-08T10:00:00.000Z",
  "borrowRecord": {
    "id": "BRW-1234567890",
    "idPegawai": "EMP001",
    "namaPegawai": "John Doe",
    "assets": ["asset-id-1", "asset-id-2"],
    "lamaDipinjam": 7,
    "kebutuhan": "Project work",
    "status": "Dikembalikan",
    "tanggalPinjam": "2024-01-01",
    "tanggalKembali": "2024-01-08"
  },
  "assets": [...],
  "summary": {
    "borrowId": "BRW-1234567890",
    "employeeId": "EMP001",
    "employeeName": "John Doe",
    "totalAssets": 2,
    "borrowDate": "2024-01-01",
    "returnDate": "2024-01-08",
    "duration": 7,
    "actualDuration": 7
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Simpan Konfigurasi
        </Button>
      </div>
    </div>
  )
}
