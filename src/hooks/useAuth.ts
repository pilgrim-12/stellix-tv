'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  signInWithEmail,
  signInWithGoogle,
  registerWithEmail,
  signOut,
  resetPassword,
} from '@/lib/auth'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false, error: null })
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, error: null }))
      await signInWithEmail(email, password)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in'
      setState((prev) => ({ ...prev, error: message }))
      throw error
    }
  }

  const loginWithGoogle = async () => {
    try {
      setState((prev) => ({ ...prev, error: null }))
      await signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in with Google'
      setState((prev) => ({ ...prev, error: message }))
      throw error
    }
  }

  const register = async (email: string, password: string, displayName: string) => {
    try {
      setState((prev) => ({ ...prev, error: null }))
      await registerWithEmail(email, password, displayName)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to register'
      setState((prev) => ({ ...prev, error: message }))
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out'
      setState((prev) => ({ ...prev, error: message }))
      throw error
    }
  }

  const sendResetEmail = async (email: string) => {
    try {
      setState((prev) => ({ ...prev, error: null }))
      await resetPassword(email)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email'
      setState((prev) => ({ ...prev, error: message }))
      throw error
    }
  }

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }))
  }

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    loginWithGoogle,
    register,
    logout,
    sendResetEmail,
    clearError,
  }
}
