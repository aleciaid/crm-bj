"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Trash2, Edit, Plus, Eye, EyeOff } from "lucide-react"
import { storage, addLog, generateId, type UserAccount, type User } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface MemberManagementProps {
  user: User
}

export function MemberManagement({ user }: MemberManagementProps) {
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "user" as "admin" | "user",
    isActive: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = () => {
    const userAccounts = storage.getUserAccounts()
    setAccounts(userAccounts)
  }

  const handleCreateAccount = () => {
    if (!formData.username.trim() || !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Username dan password harus diisi.",
        variant: "destructive",
      })
      return
    }

    // Check if username already exists
    if (accounts.some((acc) => acc.username === formData.username)) {
      toast({
        title: "Error",
        description: "Username sudah digunakan.",
        variant: "destructive",
      })
      return
    }

    const newAccount: UserAccount = {
      id: generateId(),
      username: formData.username,
      password: formData.password,
      role: formData.role,
      isActive: formData.isActive,
      createdAt: new Date().toISOString(),
      createdBy: user.username,
    }

    const updatedAccounts = [...accounts, newAccount]
    storage.setUserAccounts(updatedAccounts)
    setAccounts(updatedAccounts)

    addLog(user.username, "Create User", `Created user account: ${formData.username} (${formData.role})`)

    toast({
      title: "Berhasil",
      description: `Akun ${formData.username} berhasil dibuat.`,
    })

    setFormData({ username: "", password: "", role: "user", isActive: true })
    setIsCreateDialogOpen(false)
  }

  const handleEditAccount = () => {
    if (!editingAccount || !formData.username.trim() || !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Username dan password harus diisi.",
        variant: "destructive",
      })
      return
    }

    // Check if username already exists (excluding current account)
    if (accounts.some((acc) => acc.username === formData.username && acc.id !== editingAccount.id)) {
      toast({
        title: "Error",
        description: "Username sudah digunakan.",
        variant: "destructive",
      })
      return
    }

    const updatedAccounts = accounts.map((acc) =>
      acc.id === editingAccount.id
        ? {
            ...acc,
            username: formData.username,
            password: formData.password,
            role: formData.role,
            isActive: formData.isActive,
          }
        : acc,
    )

    storage.setUserAccounts(updatedAccounts)
    setAccounts(updatedAccounts)

    addLog(user.username, "Update User", `Updated user account: ${formData.username} (${formData.role})`)

    toast({
      title: "Berhasil",
      description: `Akun ${formData.username} berhasil diperbarui.`,
    })

    setEditingAccount(null)
    setIsEditDialogOpen(false)
  }

  const handleDeleteAccount = (account: UserAccount) => {
    // Prevent deleting own account
    if (account.username === user.username) {
      toast({
        title: "Error",
        description: "Tidak dapat menghapus akun sendiri.",
        variant: "destructive",
      })
      return
    }

    const updatedAccounts = accounts.filter((acc) => acc.id !== account.id)
    storage.setUserAccounts(updatedAccounts)
    setAccounts(updatedAccounts)

    addLog(user.username, "Delete User", `Deleted user account: ${account.username}`)

    toast({
      title: "Berhasil",
      description: `Akun ${account.username} berhasil dihapus.`,
    })
  }

  const handleToggleStatus = (account: UserAccount) => {
    // Prevent deactivating own account
    if (account.username === user.username) {
      toast({
        title: "Error",
        description: "Tidak dapat menonaktifkan akun sendiri.",
        variant: "destructive",
      })
      return
    }

    const updatedAccounts = accounts.map((acc) => (acc.id === account.id ? { ...acc, isActive: !acc.isActive } : acc))

    storage.setUserAccounts(updatedAccounts)
    setAccounts(updatedAccounts)

    addLog(
      user.username,
      "Toggle User Status",
      `${account.isActive ? "Deactivated" : "Activated"} user account: ${account.username}`,
    )

    toast({
      title: "Berhasil",
      description: `Akun ${account.username} berhasil ${account.isActive ? "dinonaktifkan" : "diaktifkan"}.`,
    })
  }

  const openEditDialog = (account: UserAccount) => {
    setEditingAccount(account)
    setFormData({
      username: account.username,
      password: account.password,
      role: account.role,
      isActive: account.isActive,
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ username: "", password: "", role: "user", isActive: true })
    setShowPassword(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manajemen Member</h2>
          <p className="text-muted-foreground">Kelola akun pengguna sistem</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Member Baru</DialogTitle>
              <DialogDescription>Buat akun pengguna baru untuk sistem CIMBJ.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Masukkan username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Masukkan password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "admin" | "user") => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Akun Aktif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleCreateAccount}>Buat Akun</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{account.username}</h3>
                    <Badge variant={account.role === "admin" ? "default" : "secondary"}>{account.role}</Badge>
                    <Badge variant={account.isActive ? "default" : "destructive"}>
                      {account.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                    {account.username === user.username && <Badge variant="outline">Anda</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dibuat: {new Date(account.createdAt).toLocaleDateString("id-ID")} oleh {account.createdBy}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={() => handleToggleStatus(account)}
                    disabled={account.username === user.username}
                  />
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(account)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAccount(account)}
                    disabled={account.username === user.username}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Perbarui informasi akun pengguna.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">Password</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Masukkan password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "user") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Akun Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEditAccount}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
