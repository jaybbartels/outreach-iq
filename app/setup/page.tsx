'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BDProfile } from '@/lib/types'

const DEMO_USER_ID = 'demo-user-001'

export default function SetupPage() {
  const [profile, setProfile] = useState<Partial<BDProfile>>({
    name: '',
    title: '',
    company_name: '',
    email: '',
    linkedin_url: '',
    expertise_tags: [],
    goals: '',
  })
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
      console.error('Error loading profile:', error)
    }
  }

  const handleInputChange = (field: keyof BDProfile, value: any) => {
    setProfile({ ...profile, [field]: value })
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    setProfile({ ...profile, expertise_tags: tags })
  }

  const handleSave = async () => {
    if (!profile.name || !profile.title || !profile.company_name) {
      setMessage('❌ Please fill in name, title, and company')
      return
    }

    try {
      setLoading(true)
      setMessage('💾 Saving...')

      const { error } = await supabase
        .from('bd_profiles')
        .upsert(
          {
            user_id: DEMO_USER_ID,
            ...profile,
          },
          { onConflict: 'user_id' }
        )

      if (error) throw error

      setMessage('✅ Profile saved successfully!')
      setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch (error) {
      setMessage('❌ Error saving profile: ' + String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-12 text-white">
          <h1 className="text-6xl font-bold mb-4">👤 Set Up Your Profile</h1>
          <p className="text-2xl">Tell us about yourself for personalized outreach</p>
        </div>

        {message && (
          <div
            className={`p-8 rounded-xl text-2xl font-bold border-4 ${
              message.includes('❌')
                ? 'bg-red-100 text-red-900 border-red-300'
                : 'bg-green-100 text-green-900 border-green-300'
            }`}
          >
            {message}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200 space-y-8">
          {/* Name */}
          <div>
            <label className="block text-2xl font-bold text-gray-900 mb-3">
              Your Name *
            </label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Jay Bartels"
              className="w-full px-6 py-4 text-xl text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-2xl font-bold text-gray-900 mb-3">
              Your Title *
            </label>
            <input
              type="text"
              value={profile.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Business Development Manager"
              className="w-full px-6 py-4 text-xl text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-2xl font-bold text-gray-900 mb-3">
              Your Company *
            </label>
            <input
              type="text"
              value={profile.company_name || ''}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              placeholder="e.g., ClassroomClick"
              className="w-full px-6 py-4 text-xl text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-2xl font-bold text-gray-900 mb-3">
              Email
            </label>
            <input
              type="email"
              value={profile.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="e.g., jay@example.com"
              className="w-full px-6 py-4 text-xl text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-2xl font-bold text-gray-900 mb-3">
              LinkedIn Profile
            </label>
            <input
              type="url"
              value={profile.linkedin_url || ''}
              onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
              placeholder="e.g., https://linkedin.com/in/jaybartels"
              className="w-full px-6 py-4 text-xl text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Expertise */}
          <div>
            <label className="block text-2xl font-bold text-gray-900 mb-3">
              Areas of Expertise
            </label>
            <p className="text-gray-700 mb-3">Separate with commas</p>
            <input
              type="text"
              value={(profile.expertise_tags as string[])?.join(', ') || ''}
              onChange={handleTagsChange}
              placeholder="e.g., SaaS, EdTech, Sales, Marketing"
              className="w-full px-6 py-4 text-xl text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Goals */}
          <div>
            <label className="block text-2xl font-bold text-gray-900 mb-3">
              Outreach Goals
            </label>
            <textarea
              value={profile.goals || ''}
              onChange={(e) => handleInputChange('goals', e.target.value)}
              placeholder="e.g., Find strategic partnerships in healthcare IT, identify companies with growth potential"
              className="w-full px-6 py-4 text-xl text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none h-32 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-6 pt-8">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-8 py-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-2xl"
            >
              {loading ? '💾 Saving...' : '✅ Save Profile'}
            </button>
            <Link href="/" className="flex-1">
              <button className="w-full px-8 py-6 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-2xl">
                ← Back
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
