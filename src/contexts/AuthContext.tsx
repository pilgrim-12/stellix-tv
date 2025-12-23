'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  signInWithEmail,
  signInWithGoogle,
  registerWithEmail,
  signOut,
  resetPassword,
} from '@/lib/auth'
import { initializeUser, saveUserIP, saveUserCountry, isUserAdmin } from '@/lib/userService'
import { useChannelStore } from '@/stores'

interface AuthContextType {
  user: User | null
  loading: boolean
  adminLoading: boolean
  error: string | null
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  sendResetEmail: (email: string) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [adminLoading, setAdminLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setLoading(false)

      if (user) {
        // Check admin status first (important for admin page access)
        setAdminLoading(true)
        try {
          const adminStatus = await isUserAdmin(user.uid)
          setIsAdmin(adminStatus)
        } finally {
          setAdminLoading(false)
        }

        // Initialize user in Firestore and load favorites + settings
        await initializeUser(user.uid, user.email || undefined)
        useChannelStore.getState().loadFavoritesFromFirebase(user.uid)
        useChannelStore.getState().loadUserSettings(user.uid)

        // Get and save user IP + country
        try {
          const res = await fetch('https://ipapi.co/json/')
          const data = await res.json()
          if (data.ip) {
            await saveUserIP(user.uid, data.ip)
          }
          if (data.country_name) {
            await saveUserCountry(user.uid, data.country_name)
          }
        } catch {
          // IP fetch failed, ignore
        }
      } else {
        setIsAdmin(false)
        setAdminLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      await signInWithEmail(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      setError(message)
      throw err
    }
  }

  const loginWithGoogle = async () => {
    try {
      setError(null)
      await signInWithGoogle()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google'
      setError(message)
      throw err
    }
  }

  const register = async (email: string, password: string, displayName: string) => {
    try {
      setError(null)
      await registerWithEmail(email, password, displayName)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register'
      setError(message)
      throw err
    }
  }

  const logout = async () => {
    try {
      await signOut()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out'
      setError(message)
      throw err
    }
  }

  const sendResetEmail = async (email: string) => {
    try {
      setError(null)
      await resetPassword(email)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email'
      setError(message)
      throw err
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        adminLoading,
        error,
        isAdmin,
        login,
        loginWithGoogle,
        register,
        logout,
        sendResetEmail,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
