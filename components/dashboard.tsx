"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { User, LogOut, Package, Users, History, Download, Upload, Sun, Moon, Webhook } from "lucide-react"
import { storage, type User as UserType } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/components/theme-provider"
import { AssetManagement } from "@/components/asset-management"
import { BorrowingSystem } from "@/components/borrowing-system"
import { ReturnSystem } from "@/components/return-system"
import { HistoryLogging } from "@/components/history-logging"
import { MemberManagement } from "@/components/member-management"
import { WebhookSettings } from "@/components/webhook-settings"

interface DashboardProps {
  user: UserType
  onLogout: () => void
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("assets")
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogout = () => {
    onLogout()
    toast({
      title: "Logout Berhasil",
      description: "Anda telah keluar dari sistem.",
    })
  }

  const handleExport = () => {
    if (user.role !== "admin") {
      toast({
        title: "Akses Ditolak",
        description: "Hanya admin yang dapat mengekspor data.",
        variant: "destructive",
      })
      return
    }

    storage.exportData()
    toast({
      title: "Export Berhasil",
      description: "Data telah diekspor ke file JSON.",
    })
  }

  const handleExportSQL = () => {
    if (user.role !== "admin") {
      toast({
        title: "Akses Ditolak",
        description: "Hanya admin yang dapat mengekspor data.",
        variant: "destructive",
      })
      return
    }

    storage.exportToSQL()
    toast({
      title: "Export SQL Berhasil",
      description: "Data telah diekspor ke format SQL.",
    })
  }

  const handleImport = () => {
    if (user.role !== "admin") {
      toast({
        title: "Akses Ditolak",
        description: "Hanya admin yang dapat mengimpor data.",
        variant: "destructive",
      })
      return
    }

    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await storage.importData(file)
      toast({
        title: "Import Berhasil",
        description: "Data telah berhasil diimpor.",
      })
      // Refresh the current tab to show updated data
      setActiveTab(activeTab)
    } catch (error) {
      toast({
        title: "Import Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengimpor data.",
        variant: "destructive",
      })
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "assets":
        return <AssetManagement user={user} />
      case "borrow":
        return <BorrowingSystem user={user} />
      case "return":
        return <ReturnSystem user={user} />
      case "members":
        if (user.role !== "admin") {
          return (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Akses Terbatas</h3>
              <p className="text-muted-foreground">Hanya admin yang dapat mengelola member.</p>
            </div>
          )
        }
        return <MemberManagement user={user} />
      case "webhooks":
        if (user.role !== "admin") {
          return (
            <div className="text-center py-12">
              <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Akses Terbatas</h3>
              <p className="text-muted-foreground">Hanya admin yang dapat mengatur webhook.</p>
            </div>
          )
        }
        return <WebhookSettings user={user} />
      case "history":
        if (user.role !== "admin") {
          return (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Akses Terbatas</h3>
              <p className="text-muted-foreground">Hanya admin yang dapat mengakses log history.</p>
            </div>
          )
        }
        return <HistoryLogging user={user} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input for import */}
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">CIMBJ</h1>
            <span className="text-sm text-muted-foreground">Sistem Manajemen Inventori</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{user.username}</span>
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">{user.role}</span>
            </div>

            <Button variant="outline" size="sm" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {user.role === "admin" && (
              <>
                <Button variant="outline" size="sm" onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportSQL}>
                  <Download className="h-4 w-4 mr-2" />
                  Export SQL
                </Button>
              </>
            )}

            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="flex space-x-8 px-6">
          {[
            { id: "assets", label: "Assets", icon: Package },
            { id: "borrow", label: "Pinjam", icon: Users },
            { id: "return", label: "Pengembalian", icon: Users },
            ...(user.role === "admin"
              ? [
                  { id: "members", label: "Members", icon: Users },
                  { id: "webhooks", label: "Webhook", icon: Webhook },
                ]
              : []),
            { id: "history", label: "Log History", icon: History },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {(tab.id === "history" || tab.id === "members" || tab.id === "webhooks") && user.role !== "admin" && (
                  <span className="text-xs">🔒</span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="p-6">{renderContent()}</main>
    </div>
  )
}
