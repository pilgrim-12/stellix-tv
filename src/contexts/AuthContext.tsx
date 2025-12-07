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
import { initializeUser, saveUserIP, isUserAdmin } from '@/lib/userService'
import { useChannelStore } from '@/stores'

interface AuthContextType {
  user: User | null
  loading: boolean
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
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      setLoading(false)

      if (user) {
        // Initialize user in Firestore and load favorites + settings
        await initializeUser(user.uid, user.email || undefined)
        useChannelStore.getState().loadFavoritesFromFirebase(user.uid)
        useChannelStore.getState().loadUserSettings(user.uid)

        // Check admin status
        const adminStatus = await isUserAdmin(user.uid)
        setIsAdmin(adminStatus)

        // Get and save user IP
        try {
          const res = await fetch('https://api.ipify.org?format=json')
          const data = await res.json()
          if (data.ip) {
            await saveUserIP(user.uid, data.ip)
          }
        } catch {
          // IP fetch failed, ignore
        }
      } else {
        setIsAdmin(false)
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
