"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { storage } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"

interface LoginFormProps {
  onLogin: (user: { username: string; role: "admin" | "user" }) => void
  onGuestAccess: () => void
}

export function LoginForm({ onLogin, onGuestAccess }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const user = storage.authenticateUser(username, password)

    if (user) {
      storage.setUser(user)
      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${user.username}!`,
      })
      onLogin(user)
    } else {
      toast({
        title: "Login Gagal",
        description: "Username atau password salah, atau akun tidak aktif.",
        variant: "destructive",
      })
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">CRM Inventory Bank Jatim - SDA</CardTitle>
            <CardDescription>Sistem Manajemen Inventori</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Masuk..." : "Masuk"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Users className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium">Akses Tamu</h3>
                <p className="text-sm text-muted-foreground">Akses form peminjaman dan pengembalian tanpa login</p>
              </div>
              <Button variant="outline" className="w-full bg-transparent" onClick={onGuestAccess}>
                Masuk sebagai Tamu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
