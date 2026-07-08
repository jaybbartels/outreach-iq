'use client'

import { useEffect, useState } from 'react'
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
    expertise_tags: [],
    goals: '',
  })
  const [savedProfiles, setSavedProfiles] = useState<BDProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('bd_profiles')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedProfiles(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading profiles:', error)
      setLoading(false)
    }
  }

  const loadProfile = (profileId: string) => {
    const selected = savedProfiles.find((p) => p.id === profileId)
    if (selected) {
      setProfile(selected)
      setSelectedProfileId(profileId)
      setMessage(`✅ Loaded profile: ${selected.name}`)
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

  const handleSaveProfile = async () => {
    if (!profile.name || !profile.title || !profile.company_name) {
      setMessage('❌ Please fill in Name, Title, and Company')
      return
    }

    try {
      if (selectedProfileId) {
        // Update existing
        const { error } = await supabase
          .from('bd_profiles')
          .update({
            ...profile,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedProfileId)

        if (error) throw error
        setMessage(`✅ Profile updated: ${profile.name}`)
      } else {
        // Create new
        const { data, error } = await supabase
          .from('bd_profiles')
          .insert([
            {
              user_id: DEMO_USER_ID,
              ...profile,
            },
          ])
          .select()

        if (error) throw error
        setSelectedProfileId(data[0].id)
        setMessage(`✅ Profile saved: ${profile.name}`)
        loadProfiles()
      }

      // Store in localStorage for campaign generation
      localStorage.setItem(
        'messageData',
        JSON.stringify({
          profile: { ...profile, id: selectedProfileId },
        })
      )
    } catch (error) {
      setMessage('❌ Error saving profile: ' + String(error))
    }
  }

  const handleNewProfile = () => {
    setSelectedProfileId('')
    setProfile({
      name: '',
      title: '',
      company_name: '',
      email: '',
      linkedin_url: '',
      expertise_tags: [],
      goals: '',
    })
    setMessage('')
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-12 text-white mb-8">
          <h1 className="text-5xl font-bold mb-3">👤 Business Development Profile</h1>
          <p className="text-xl">Set up your profile for personalized outreach</p>
        </div>

        {message && (
          <div
            className={`p-6 rounded-lg text-xl font-bold mb-8 border-2 ${
              message.includes('✅')
                ? 'bg-green-100 text-green-900 border-green-300'
                : 'bg-red-100 text-red-900 border-red-300'
            }`}
          >
            {message}
          </div>
        )}

        {/* Profile Selector */}
        {!loading && savedProfiles.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 Saved Profiles</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {savedProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadProfile(p.id)}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    selectedProfileId === p.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-600">{p.title} at {p.company_name}</p>
                </button>
              ))}
            </div>
            <button
              onClick={handleNewProfile}
              className="w-full px-6 py-3 border-2 border-gray-300 text-gray-900 rounded-lg font-bold hover:bg-gray-50"
            >
              + Create New Profile
            </button>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-lg p-12 border-2 border-gray-200 space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">
            {selectedProfileId ? '✏️ Edit Profile' : '➕ New Profile'}
          </h2>

          <div>
            <label className="block text-lg font-bold text-gray-900 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={profile.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Business Development Manager"
                className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-lg font-bold text-gray-900 mb-2">
                Company *
              </label>
              <input
                type="text"
                value={profile.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                placeholder="Your company name"
                className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your.email@company.com"
                className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-lg font-bold text-gray-900 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-lg font-bold text-gray-900 mb-2">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={profile.linkedin_url || ''}
              onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-lg font-bold text-gray-900 mb-2">
              Expertise Tags
            </label>
            <input
              type="text"
              value={(profile.expertise_tags as string[])?.join(', ') || ''}
              onChange={handleTagsChange}
              placeholder="healthcare, partnerships, sales (comma-separated)"
              className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-lg font-bold text-gray-900 mb-2">
              Outreach Goals
            </label>
            <textarea
              value={profile.goals || ''}
              onChange={(e) => handleInputChange('goals', e.target.value)}
              placeholder="What do you want to achieve with your outreach campaigns?"
              rows={4}
              className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-4 pt-6 border-t-2 border-gray-200">
            <button
              onClick={handleSaveProfile}
              className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg"
            >
              💾 {selectedProfileId ? 'Update' : 'Save'} Profile
            </button>
            <Link href="/select" className="flex-1">
              <button className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg">
                ✅ Continue to Select
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
