'use client'

import Link from 'next/link'
import { Tv } from 'lucide-react'
import { LoginForm } from '@/components/auth'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
          <Tv className="h-8 w-8 text-purple-500" />
          <span className="text-white">Stellix</span>
          <span className="text-purple-500">TV</span>
        </Link>
      </div>
      <LoginForm />
    </div>
  )
}
