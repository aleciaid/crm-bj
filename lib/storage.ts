export interface User {
  username: string
  role: "admin" | "user"
}

export interface UserAccount {
  id: string
  username: string
  password: string
  role: "admin" | "user"
  isActive: boolean
  createdAt: string
  createdBy: string
}

export interface Asset {
  id: string
  nama: string
  sku?: string
  deskripsi?: string
  kategori: string
  nilai: number
  qty: number
  status: "Instock" | "Dipinjam"
}

export interface Category {
  id: string
  nama: string
}

export interface BorrowRecord {
  id: string
  idPegawai: string
  namaPegawai: string
  assets: string[]
  lamaDipinjam: number
  kebutuhan: string
  status: "Dipinjam" | "Dikembalikan"
  tanggalPinjam: string
  tanggalKembali?: string
}

export interface LogEntry {
  id: string
  timestamp: string
  user: string
  action: string
  details: string
}

export interface VersionLogEntry {
  id: string
  version: string
  date: string
  changes: string[]
}

export interface WebhookConfig {
  borrowWebhook: string
  returnWebhook: string
}

// Storage keys
const STORAGE_KEYS = {
  USER: "cimbj_user",
  USER_ACCOUNTS: "cimbj_user_accounts",
  ASSETS: "cimbj_assets",
  CATEGORIES: "cimbj_categories",
  BORROWS: "cimbj_borrows",
  LOGS: "cimbj_logs",
  THEME: "cimbj_theme",
  WEBHOOKS: "cimbj_webhooks",
  VERSION_LOGS: "cimbj_version_logs",
} as const

// Storage utilities
export const storage = {
  // User management
  setUser: (user: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
    addLog(user.username, "Login", `User ${user.username} logged in as ${user.role}`)
  },

  getUser: (): User | null => {
    const user = localStorage.getItem(STORAGE_KEYS.USER)
    return user ? JSON.parse(user) : null
  },

  clearUser: () => {
    const user = storage.getUser()
    if (user) {
      addLog(user.username, "Logout", `User ${user.username} logged out`)
    }
    localStorage.removeItem(STORAGE_KEYS.USER)
  },

  // Assets management
  getAssets: (): Asset[] => {
    const assets = localStorage.getItem(STORAGE_KEYS.ASSETS)
    return assets ? JSON.parse(assets) : []
  },

  setAssets: (assets: Asset[]) => {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets))
  },

  // Categories management
  getCategories: (): Category[] => {
    const categories = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    return categories ? JSON.parse(categories) : []
  },

  setCategories: (categories: Category[]) => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories))
  },

  // Borrow records management
  getBorrows: (): BorrowRecord[] => {
    const borrows = localStorage.getItem(STORAGE_KEYS.BORROWS)
    return borrows ? JSON.parse(borrows) : []
  },

  setBorrows: (borrows: BorrowRecord[]) => {
    localStorage.setItem(STORAGE_KEYS.BORROWS, JSON.stringify(borrows))
  },

  // Logs management
  getLogs: (): LogEntry[] => {
    const logs = localStorage.getItem(STORAGE_KEYS.LOGS)
    return logs ? JSON.parse(logs) : []
  },

  setLogs: (logs: LogEntry[]) => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs))
  },

  // Theme management
  getTheme: (): "light" | "dark" => {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME)
    return theme === "light" ? "light" : "dark"
  },

  // Version logs management
  getVersionLogs: (): VersionLogEntry[] => {
    const raw = localStorage.getItem(STORAGE_KEYS.VERSION_LOGS)
    if (raw) return JSON.parse(raw)
    // Default seeded version logs (hardcoded) when none stored
    const seeded: VersionLogEntry[] = [
      {
        id: "2025-09-30-001",
        version: "1.2.0",
        date: new Date().toISOString().split("T")[0],
        changes: [
          "Tambah Version Log manual (add/edit/delete)",
          "Tambah tombol Generate SKU unik pada form asset",
          "Kirim webhook untuk peminjaman & pengembalian dari Guest",
          "Popup sukses setelah peminjaman Guest dengan detail lengkap",
        ],
      },
      {
        id: "2025-09-29-001",
        version: "1.1.0",
        date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
        changes: [
          "Tambah konfigurasi webhook peminjaman & pengembalian",
          "Integrasi log history ekspor CSV dan filter lanjutan",
        ],
      },
      {
        id: "2025-09-28-001",
        version: "1.0.0",
        date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
        changes: [
          "Rilis awal: Manajemen Asset, Peminjaman, Pengembalian, Guest Access",
        ],
      },
    ]
    // Do not persist by default; allow user to push/store when ready
    return seeded
  },

  setVersionLogs: (entries: VersionLogEntry[]) => {
    localStorage.setItem(STORAGE_KEYS.VERSION_LOGS, JSON.stringify(entries))
  },

  setTheme: (theme: "light" | "dark") => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme)
  },

  getWebhookConfig: (): WebhookConfig => {
    const config = localStorage.getItem(STORAGE_KEYS.WEBHOOKS)
    return config ? JSON.parse(config) : { borrowWebhook: "", returnWebhook: "" }
  },

  setWebhookConfig: (config: WebhookConfig) => {
    localStorage.setItem(STORAGE_KEYS.WEBHOOKS, JSON.stringify(config))
  },

  // Export functionality
  exportData: () => {
    const data = {
      assets: storage.getAssets(),
      categories: storage.getCategories(),
      borrows: storage.getBorrows(),
      logs: storage.getLogs(),
      exportDate: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cimbj-data-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    const user = storage.getUser()
    if (user) {
      addLog(user.username, "Export", "Data exported to JSON")
    }
  },

  exportToSQL: () => {
    const assets = storage.getAssets()
    const categories = storage.getCategories()
    const borrows = storage.getBorrows()

    let sql = "-- CIMBJ Database Export\n\n"

    // Categories table
    sql += "CREATE TABLE IF NOT EXISTS categories (\n"
    sql += "  id VARCHAR(255) PRIMARY KEY,\n"
    sql += "  nama VARCHAR(255) NOT NULL\n"
    sql += ");\n\n"

    categories.forEach((cat) => {
      sql += `INSERT INTO categories (id, nama) VALUES ('${cat.id}', '${cat.nama}');\n`
    })

    // Assets table
    sql += "\nCREATE TABLE IF NOT EXISTS assets (\n"
    sql += "  id VARCHAR(255) PRIMARY KEY,\n"
    sql += "  nama VARCHAR(255) NOT NULL,\n"
    sql += "  sku VARCHAR(255),\n"
    sql += "  deskripsi TEXT,\n"
    sql += "  kategori VARCHAR(255),\n"
    sql += "  nilai DECIMAL(10,2),\n"
    sql += "  qty INT,\n"
    sql += "  status VARCHAR(50)\n"
    sql += ");\n\n"

    assets.forEach((asset) => {
      sql += `INSERT INTO assets (id, nama, sku, deskripsi, kategori, nilai, qty, status) VALUES ('${asset.id}', '${asset.nama}', ${asset.sku ? `'${asset.sku}'` : "NULL"}, ${asset.deskripsi ? `'${asset.deskripsi}'` : "NULL"}, '${asset.kategori}', ${asset.nilai}, ${asset.qty}, '${asset.status}');\n`
    })

    // Borrows table
    sql += "\nCREATE TABLE IF NOT EXISTS borrows (\n"
    sql += "  id VARCHAR(255) PRIMARY KEY,\n"
    sql += "  id_pegawai VARCHAR(255),\n"
    sql += "  nama_pegawai VARCHAR(255),\n"
    sql += "  assets TEXT,\n"
    sql += "  lama_dipinjam INT,\n"
    sql += "  kebutuhan TEXT,\n"
    sql += "  status VARCHAR(50),\n"
    sql += "  tanggal_pinjam DATE,\n"
    sql += "  tanggal_kembali DATE\n"
    sql += ");\n\n"

    borrows.forEach((borrow) => {
      sql += `INSERT INTO borrows (id, id_pegawai, nama_pegawai, assets, lama_dipinjam, kebutuhan, status, tanggal_pinjam, tanggal_kembali) VALUES ('${borrow.id}', '${borrow.idPegawai}', '${borrow.namaPegawai}', '${JSON.stringify(borrow.assets)}', ${borrow.lamaDipinjam}, '${borrow.kebutuhan}', '${borrow.status}', '${borrow.tanggalPinjam}', ${borrow.tanggalKembali ? `'${borrow.tanggalKembali}'` : "NULL"});\n`
    })

    const blob = new Blob([sql], { type: "text/sql" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cimbj-database-${new Date().toISOString().split("T")[0]}.sql`
    a.click()
    URL.revokeObjectURL(url)

    const user = storage.getUser()
    if (user) {
      addLog(user.username, "Export SQL", "Data exported to SQL format")
    }
  },

  // Import functionality
  importData: (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)

          // Validate data structure
          if (data.assets && data.categories && data.borrows && data.logs) {
            storage.setAssets(data.assets)
            storage.setCategories(data.categories)
            storage.setBorrows(data.borrows)
            storage.setLogs(data.logs)

            const user = storage.getUser()
            if (user) {
              addLog(user.username, "Import", `Data imported from ${file.name}`)
            }
            resolve(true)
          } else {
            reject(new Error("Format file tidak valid"))
          }
        } catch (error) {
          reject(new Error("File tidak dapat dibaca"))
        }
      }
      reader.onerror = () => reject(new Error("Error membaca file"))
      reader.readAsText(file)
    })
  },

  // User accounts management functions
  getUserAccounts: (): UserAccount[] => {
    const accounts = localStorage.getItem(STORAGE_KEYS.USER_ACCOUNTS)
    if (!accounts) {
      // Initialize with default admin and user accounts
      const defaultAccounts: UserAccount[] = [
        {
          id: "admin-default",
          username: "admin",
          password: "admin",
          role: "admin",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "system",
        },
        {
          id: "user-default",
          username: "user",
          password: "user",
          role: "user",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "system",
        },
      ]
      localStorage.setItem(STORAGE_KEYS.USER_ACCOUNTS, JSON.stringify(defaultAccounts))
      return defaultAccounts
    }
    return JSON.parse(accounts)
  },

  setUserAccounts: (accounts: UserAccount[]) => {
    localStorage.setItem(STORAGE_KEYS.USER_ACCOUNTS, JSON.stringify(accounts))
  },

  authenticateUser: (username: string, password: string): User | null => {
    const accounts = storage.getUserAccounts()
    const account = accounts.find((acc) => acc.username === username && acc.password === password && acc.isActive)

    if (account) {
      return {
        username: account.username,
        role: account.role,
      }
    }
    return null
  },
}

// Helper function to add log entries
export const addLog = (user: string, action: string, details: string) => {
  const logs = storage.getLogs()
  const newLog: LogEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    user,
    action,
    details,
  }
  logs.push(newLog)
  storage.setLogs(logs)
}

// Generate unique ID
export const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

export const sendWebhook = async (url: string, data: any) => {
  if (!url.trim()) return

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      console.error("Webhook failed:", response.status, response.statusText)
    }
  } catch (error) {
    console.error("Webhook error:", error)
  }
}

export const sendBorrowWebhook = async (borrowData: BorrowRecord, assets: Asset[]) => {
  const webhookConfig = storage.getWebhookConfig()
  if (!webhookConfig.borrowWebhook) return

  const borrowedAssets = assets.filter((asset) => borrowData.assets.includes(asset.id))

  const webhookPayload = {
    type: "borrow",
    timestamp: new Date().toISOString(),
    borrowRecord: borrowData,
    assets: borrowedAssets,
    summary: {
      borrowId: borrowData.id,
      employeeId: borrowData.idPegawai,
      employeeName: borrowData.namaPegawai,
      totalAssets: borrowData.assets.length,
      duration: borrowData.lamaDipinjam,
      purpose: borrowData.kebutuhan,
      borrowDate: borrowData.tanggalPinjam,
    },
  }

  await sendWebhook(webhookConfig.borrowWebhook, webhookPayload)
}

export const sendReturnWebhook = async (borrowData: BorrowRecord, assets: Asset[]) => {
  const webhookConfig = storage.getWebhookConfig()
  if (!webhookConfig.returnWebhook) return

  const returnedAssets = assets.filter((asset) => borrowData.assets.includes(asset.id))

  const webhookPayload = {
    type: "return",
    timestamp: new Date().toISOString(),
    borrowRecord: borrowData,
    assets: returnedAssets,
    summary: {
      borrowId: borrowData.id,
      employeeId: borrowData.idPegawai,
      employeeName: borrowData.namaPegawai,
      totalAssets: borrowData.assets.length,
      borrowDate: borrowData.tanggalPinjam,
      returnDate: borrowData.tanggalKembali,
      duration: borrowData.lamaDipinjam,
      actualDuration: borrowData.tanggalKembali
        ? Math.ceil(
            (new Date(borrowData.tanggalKembali).getTime() - new Date(borrowData.tanggalPinjam).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
    },
  }

  await sendWebhook(webhookConfig.returnWebhook, webhookPayload)
}
