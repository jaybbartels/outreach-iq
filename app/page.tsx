'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
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
      const { data } = await supabase
        .from('bd_profiles')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .single()

      setProfile(data)
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
          <>
            {/* Profile Section */}
            <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200">
              <h2 className="text-4xl font-bold text-gray-900 mb-12">👤 Your Profile</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Name */}
                <div className="bg-blue-50 p-6 rounded-lg">
                  <p className="text-sm font-bold text-blue-600 uppercase">Name</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3">{profile.name}</p>
                </div>

                {/* Title */}
                <div className="bg-purple-50 p-6 rounded-lg">
                  <p className="text-sm font-bold text-purple-600 uppercase">Title</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3">
                    {profile.title || '—'}
                  </p>
                </div>

                {/* Company */}
                <div className="bg-green-50 p-6 rounded-lg">
                  <p className="text-sm font-bold text-green-600 uppercase">Company</p>
                  <p className="text-3xl font-bold text-gray-900 mt-3">
                    {profile.company_name || '—'}
                  </p>
                </div>

                {/* Expertise */}
                <div className="bg-yellow-50 p-6 rounded-lg md:col-span-2">
                  <p className="text-sm font-bold text-yellow-600 uppercase">Expertise</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {profile.expertise_tags && profile.expertise_tags.length > 0 ? (
                      profile.expertise_tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="bg-yellow-200 text-yellow-900 px-4 py-2 rounded-full font-semibold text-lg"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-700">No expertise tags</p>
                    )}
                  </div>
                </div>

                {/* Goals */}
                <div className="bg-red-50 p-6 rounded-lg">
                  <p className="text-sm font-bold text-red-600 uppercase">Goals</p>
                  <p className="text-2xl font-bold text-gray-900 mt-3">
                    {profile.goals || '—'}
                  </p>
                </div>
              </div>

              {/* Edit Button */}
              <Link href="/setup">
                <button className="mt-12 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg">
                  ✏️ Edit Profile
                </button>
              </Link>
            </div>

            {/* Action Section */}
            <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200">
              <h2 className="text-4xl font-bold text-gray-900 mb-8">🚀 Ready to Start?</h2>

              <div className="space-y-6">
                <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-8">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl">📋</span>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        Step 1: Select Targets
                      </h3>
                      <p className="text-lg text-gray-700 mb-6">
                        Choose executives from your collections. Filter by company, title, and confidence level.
                      </p>
                      <Link href="/select">
                        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg">
                          Go to Select Targets →
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border-4 border-purple-300 rounded-lg p-8">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl">🧠</span>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        Step 2: Generate Strategies
                      </h3>
                      <p className="text-lg text-gray-700 mb-6">
                        AI analyzes each executive and creates personalized connection strategies with action steps.
                      </p>
                      <p className="text-sm text-gray-600">
                        (Auto-navigates after selecting executives)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-4 border-green-300 rounded-lg p-8">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl">✉️</span>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        Step 3: Create Messages
                      </h3>
                      <p className="text-lg text-gray-700 mb-6">
                        Generate outreach messages for Email, LinkedIn, or SMS. Add context, create variants, and test A/B messaging.
                      </p>
                      <p className="text-sm text-gray-600">
                        (Auto-navigates after selecting strategies)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Link href="/select">
                <button className="mt-12 w-full px-8 py-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-2xl">
                  🎯 Start Campaign →
                </button>
              </Link>
            </div>

            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-8 border-4 border-gray-200">
                <p className="text-5xl mb-4">🗄️</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Data Synced</h3>
                <p className="text-gray-700">
                  All executive data comes from your Outreach database. Keep everything in sync.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 border-4 border-gray-200">
                <p className="text-5xl mb-4">🤖</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Powered</h3>
                <p className="text-gray-700">
                  Claude analyzes each executive and creates hyper-personalized strategies and messages.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-8 border-4 border-gray-200">
                <p className="text-5xl mb-4">📊</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Track Results</h3>
                <p className="text-gray-700">
                  Save messages and track responses to optimize your outreach over time.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border-4 border-gray-200">
            <p className="text-2xl text-gray-700 font-bold mb-6">No profile found</p>
            <Link href="/setup">
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg">
                Create Profile →
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
