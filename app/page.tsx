'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BDProfile } from '@/lib/types'

export default function Home() {
  const [profile, setProfile] = useState<BDProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const userId = 'demo-user-001'
      
      const { data, error } = await supabase
        .from('bd_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.log('No profile found, create one to get started')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
        <h2 className="text-5xl font-bold mb-4">Welcome to OutreachIQ</h2>
        <p className="text-xl mb-6">
          Discover the best way to connect with executives using AI-powered strategy generation.
          LinkedIn, conferences, geographic proximity, or multi-step approaches—we find the path that works.
        </p>
        {!profile ? (
          <Link href="/setup">
            <button className="px-8 py-3 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100">
              👤 Create Your Profile
            </button>
          </Link>
        ) : (
          <Link href="/select">
            <button className="px-8 py-3 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100">
              🎯 Start New Campaign
            </button>
          </Link>
        )}
      </div>

      {/* Current Profile */}
      {loading ? (
        <div className="text-center text-gray-700 text-xl">Loading...</div>
      ) : profile ? (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-4xl font-bold mb-8 text-gray-900">📊 Your Profile</h3>
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-sm font-bold text-blue-600 uppercase">Name</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{profile.name}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-sm font-bold text-blue-600 uppercase">Title</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{profile.title || '—'}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-sm font-bold text-blue-600 uppercase">Company</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{profile.company_name || '—'}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-sm font-bold text-blue-600 uppercase">Location</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{profile.location_city || '—'}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg mb-8">
            <p className="text-sm font-bold text-blue-600 uppercase mb-4">Expertise</p>
            <div className="flex flex-wrap gap-3">
              {profile.expertise_tags && profile.expertise_tags.length > 0 ? (
                profile.expertise_tags.map((tag, idx) => (
                  <span key={idx} className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold text-lg">
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-gray-700 text-lg">No expertise tags set</p>
              )}
            </div>
          </div>

          {profile.goals && (
            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <p className="text-sm font-bold text-blue-600 uppercase mb-4">Goals</p>
              <p className="text-xl text-gray-900">{profile.goals}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Link href="/setup" className="flex-1">
              <button className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg">
                ✏️ Edit Profile
              </button>
            </Link>
            <Link href="/select" className="flex-1">
              <button className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg">
                🎯 Start Campaign
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-gray-900 mb-6 text-xl">No profile found. Create one to get started.</p>
          <Link href="/setup">
            <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-bold">
              Create Profile
            </button>
          </Link>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-5xl mb-4">🔗</div>
          <h3 className="font-bold text-2xl mb-3 text-gray-900">LinkedIn Strategy</h3>
          <p className="text-gray-700 text-lg">
            Find mutual connections and shared networks for warm introductions
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="font-bold text-2xl mb-3 text-gray-900">Conference Approach</h3>
          <p className="text-gray-700 text-lg">
            Identify shared conference attendance for in-person connections
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-5xl mb-4">🌍</div>
          <h3 className="font-bold text-2xl mb-3 text-gray-900">Geographic Proximity</h3>
          <p className="text-gray-700 text-lg">
            Discover executives near your location for local outreach
          </p>
        </div>
      </div>
    </div>
  )
}
