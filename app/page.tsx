'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/src/lib/api'
import { BDProfile } from '@/lib/types'

const DEMO_USER_ID = 'demo-user-001'

export default function HomePage() {
  const [profile, setProfile] = useState<BDProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const response = await api.getProfiles(DEMO_USER_ID)
      const profiles = response.data?.profiles || []
      if (profiles.length > 0) {
        setProfile(profiles[0])
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-12 text-white">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-6xl">🎯</span>
            <h1 className="text-6xl font-bold">OutreachIQ</h1>
          </div>
          <p className="text-2xl">Smart Strategy to Connect with Executives</p>
        </div>

        {loading ? (
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">⏳</div>
            <p className="text-2xl text-gray-700 font-bold">Loading...</p>
          </div>
        ) : profile ? (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold mb-6">Welcome, {profile.name}!</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Title</p>
                  <p className="font-semibold">{profile.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Company</p>
                  <p className="font-semibold">{profile.company_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-semibold">{profile.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-semibold">{profile.phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/setup" className="block p-8 bg-white rounded-lg shadow hover:shadow-lg transition text-center">
                <div className="text-4xl mb-4">⚙️</div>
                <h3 className="text-xl font-bold mb-2">Setup</h3>
                <p className="text-gray-600">Configure your strategy</p>
              </Link>

              <Link href="/select" className="block p-8 bg-white rounded-lg shadow hover:shadow-lg transition text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-xl font-bold mb-2">Select</h3>
                <p className="text-gray-600">Choose your targets</p>
              </Link>

              <Link href="/messages" className="block p-8 bg-white rounded-lg shadow hover:shadow-lg transition text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-xl font-bold mb-2">Messages</h3>
                <p className="text-gray-600">Craft your outreach</p>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-2xl text-gray-700">No profile found</p>
          </div>
        )}
      </div>
    </div>
  )
}
