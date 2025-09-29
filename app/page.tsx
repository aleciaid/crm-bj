"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/login-form"
import { Dashboard } from "@/components/dashboard"
import { GuestAccess } from "@/components/guest-access"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/toast-provider"
import { storage, type User } from "@/lib/storage"

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [showGuestAccess, setShowGuestAccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = storage.getUser()
    if (savedUser) {
      setUser(savedUser)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
    setShowGuestAccess(false)
  }

  const handleLogout = () => {
    storage.clearUser()
    setUser(null)
    setShowGuestAccess(false)
  }

  const handleGuestAccess = () => {
    setShowGuestAccess(true)
  }

  const handleBackFromGuest = () => {
    setShowGuestAccess(false)
  }

  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Memuat...</p>
          </div>
        </div>
        <ToastProvider />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : showGuestAccess ? (
        <GuestAccess onBack={handleBackFromGuest} />
      ) : (
        <LoginForm onLogin={handleLogin} onGuestAccess={handleGuestAccess} />
      )}
      <ToastProvider />
    </ThemeProvider>
  )
}
