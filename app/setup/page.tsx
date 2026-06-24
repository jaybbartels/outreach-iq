'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BDProfile } from '@/lib/types'
import Link from 'next/link'

const DEMO_USER_ID = 'demo-user-001'

export default function SetupPage() {
  const [profile, setProfile] = useState<Partial<BDProfile>>({
    name: '',
    title: '',
    company_name: '',
    email: '',
    linkedin_url: '',
    location_city: '',
    location_state: '',
    expertise_tags: [],
    goals: '',
  })

  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.log('No existing profile')
    }
  }

  const handleAddTag = () => {
    if (newTag.trim()) {
      setProfile({
        ...profile,
        expertise_tags: [...(profile.expertise_tags || []), newTag],
      })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setProfile({
      ...profile,
      expertise_tags: (profile.expertise_tags || []).filter((t) => t !== tag),
    })
  }

  const handleSave = async () => {
    if (!profile.name || !profile.email) {
      setMessage('❌ Name and email are required')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const data = {
        user_id: DEMO_USER_ID,
        name: profile.name,
        title: profile.title || null,
        company_name: profile.company_name || null,
        email: profile.email,
        linkedin_url: profile.linkedin_url || null,
        location_city: profile.location_city || null,
        location_state: profile.location_state || null,
        expertise_tags: profile.expertise_tags || [],
        goals: profile.goals || null,
      }

      console.log('Saving profile:', data)

      const { data: result, error } = await supabase.from('bd_profiles').upsert([data], {
        onConflict: 'user_id',
      })

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message || 'Unknown database error')
      }

      console.log('Profile saved:', result)
      setMessage('✅ Profile saved successfully!')
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (error) {
      console.error('Save error:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      setMessage('❌ Error saving profile: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">👤 Your Profile</h1>
          <p className="text-xl text-gray-700">
            Tell us about yourself so we can generate personalized outreach strategies
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          
          {/* Section 1: Basic Information */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b-2 border-blue-200">
              <span className="text-3xl">📋</span>
              <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={profile.name || ''}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Jay Bartels"
                  className="w-full px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
                />
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="jay@example.com"
                  className="w-full px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Job Title
                </label>
                <input
                  type="text"
                  value={profile.title || ''}
                  onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                  placeholder="VP Business Development"
                  className="w-full px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Company
                </label>
                <input
                  type="text"
                  value={profile.company_name || ''}
                  onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                  placeholder="Acme Corp"
                  className="w-full px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
                />
              </div>

              {/* LinkedIn */}
              <div className="md:col-span-2">
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  value={profile.linkedin_url || ''}
                  onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/jayb"
                  className="w-full px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b-2 border-green-200">
              <span className="text-3xl">🌍</span>
              <h2 className="text-2xl font-bold text-gray-900">Your Location</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  City
                </label>
                <input
                  type="text"
                  value={profile.location_city || ''}
                  onChange={(e) => setProfile({ ...profile, location_city: e.target.value })}
                  placeholder="San Francisco"
                  className="w-full px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
                />
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  State / Region
                </label>
                <input
                  type="text"
                  value={profile.location_state || ''}
                  onChange={(e) => setProfile({ ...profile, location_state: e.target.value })}
                  placeholder="CA"
                  className="w-full px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Expertise & Goals */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b-2 border-purple-200">
              <span className="text-3xl">⭐</span>
              <h2 className="text-2xl font-bold text-gray-900">Expertise & Goals</h2>
            </div>

            {/* Expertise Tags */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Your Areas of Expertise
              </label>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="e.g., Healthcare, SaaS, Enterprise"
                  className="flex-1 px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition bg-white"
                />
                <button
                  onClick={handleAddTag}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                >
                  Add +
                </button>
              </div>

              {/* Tag Display */}
              {(profile.expertise_tags || []).length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {(profile.expertise_tags || []).map((tag, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-2 rounded-full text-lg font-semibold flex items-center gap-2"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:opacity-70 ml-2 text-xl"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goals */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Your Outreach Goals
              </label>
              <textarea
                value={profile.goals || ''}
                onChange={(e) => setProfile({ ...profile, goals: e.target.value })}
                placeholder="e.g., Connect with healthcare CIOs to discuss digital transformation initiatives and AI implementation"
                rows={5}
                className="w-full px-5 py-3 text-lg text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition resize-none bg-white"
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg text-lg font-semibold ${
                message.includes('✅')
                  ? 'bg-green-100 text-green-800 border-2 border-green-400'
                  : 'bg-red-100 text-red-800 border-2 border-red-400'
              }`}
            >
              {message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-lg disabled:opacity-50 transition transform hover:scale-105"
            >
              {loading ? '💾 Saving...' : '💾 Save Profile'}
            </button>
            <Link href="/">
              <button className="flex-1 px-6 py-4 bg-gray-400 hover:bg-gray-500 text-white font-bold text-lg rounded-lg transition">
                ← Back
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
