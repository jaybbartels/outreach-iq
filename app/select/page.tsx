'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Collection, Executive } from '@/lib/types'

export default function SelectPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [executives, setExecutives] = useState<Executive[]>([])
  const [filteredExecutives, setFilteredExecutives] = useState<Executive[]>([])
  const [selectedExecutiveIds, setSelectedExecutiveIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      const { data } = await supabase.from('collections').select('*').order('name')
      setCollections(data || [])
    } catch (error) {
      setMessage('❌ Error loading collections')
    } finally {
      setLoading(false)
    }
  }

  const selectCollection = async (collection: Collection) => {
    try {
      setLoading(true)
      setMessage('')
      setSearchQuery('')
      setSelectedExecutiveIds(new Set())

      setSelectedCollection(collection)

      const { data: collectionExecs } = await supabase
        .from('collection_executives')
        .select('executive_id')
        .eq('collection_id', collection.id)

      const executiveIds = collectionExecs?.map((ce) => ce.executive_id) || []

      if (executiveIds.length === 0) {
        setExecutives([])
        setFilteredExecutives([])
        setMessage('❌ No executives in this collection')
        return
      }

      const { data: execData } = await supabase
        .from('executives')
        .select('*')
        .in('id', executiveIds)
        .order('name')

      setExecutives(execData || [])
      setFilteredExecutives(execData || [])
    } catch (error) {
      setMessage('❌ Error loading executives')
    } finally {
      setLoading(false)
    }
  }

  // Filter executives by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExecutives(executives)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = executives.filter(
        (exec) =>
          exec.name.toLowerCase().includes(query) ||
          exec.title.toLowerCase().includes(query) ||
          (exec.company_name || '').toLowerCase().includes(query) ||
          (exec.email || '').toLowerCase().includes(query)
      )
      setFilteredExecutives(filtered)
    }
  }, [searchQuery, executives])

  const toggleExecutive = (id: string) => {
    const newSelected = new Set(selectedExecutiveIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedExecutiveIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedExecutiveIds.size === filteredExecutives.length) {
      setSelectedExecutiveIds(new Set())
    } else {
      setSelectedExecutiveIds(new Set(filteredExecutives.map((e) => e.id)))
    }
  }

  const handleGenerateStrategies = () => {
    if (selectedExecutiveIds.size === 0) {
      setMessage('❌ Please select at least one executive')
      return
    }

    if (!selectedCollection) {
      setMessage('❌ Please select a collection')
      return
    }

    localStorage.setItem(
      'campaignData',
      JSON.stringify({
        collectionId: selectedCollection.id,
        collectionName: selectedCollection.name,
        selectedExecutiveIds: Array.from(selectedExecutiveIds),
        selectedCount: selectedExecutiveIds.size,
      })
    )

    window.location.href = '/strategies'
  }

  const getEngagementBadge = (score: number | null) => {
    if (!score) return null
    if (score >= 70) return '✅ high'
    if (score >= 40) return '⚠️ medium'
    return '❌ low'
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-5xl font-bold mb-3">🎯 Select Executive Targets</h1>
          <p className="text-xl">
            Choose a collection and select the executives you want to target
          </p>
        </div>

        {message && (
          <div
            className={`p-6 rounded-xl text-xl font-bold ${
              message.includes('❌')
                ? 'bg-red-100 text-red-900 border-4 border-red-300'
                : 'bg-green-100 text-green-900 border-4 border-green-300'
            }`}
          >
            {message}
          </div>
        )}

        {/* Step 1: Choose Collection */}
        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-gray-900">Step 1: Choose Collection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => selectCollection(collection)}
                className={`p-8 rounded-xl border-4 text-left transition ${
                  selectedCollection?.id === collection.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-blue-400'
                }`}
              >
                <div className="text-5xl mb-4">
                  {collection.name.includes('Healthcare') ? '🏥' : '🤖'}
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {collection.name}
                </h3>
                <p className="text-gray-700">
                  {collection.description || 'Migrated from domains on June 23, 2026'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Executives */}
        {selectedCollection && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-bold text-gray-900">
                Step 2: Select Executives{' '}
                <span className="text-blue-600">({selectedExecutiveIds.size} selected)</span>
              </h2>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    🔍 Search Executives
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, title, company, or email..."
                    className="w-full px-6 py-4 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {searchQuery && (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-700 font-semibold">
                      Found {filteredExecutives.length} of {executives.length} executives
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold"
                    >
                      Clear Search
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="text-center bg-white rounded-xl shadow-lg p-12">
                <div className="animate-spin text-6xl mb-6">⏳</div>
                <p className="text-2xl text-gray-700 font-bold">Loading executives...</p>
              </div>
            ) : filteredExecutives.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-2xl text-gray-700 font-bold">
                  {searchQuery ? 'No executives match your search' : 'No executives in this collection'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Select All Button */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <button
                    onClick={handleSelectAll}
                    className={`w-full px-6 py-3 rounded-lg font-bold text-lg transition ${
                      selectedExecutiveIds.size === filteredExecutives.length
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                    }`}
                  >
                    {selectedExecutiveIds.size === filteredExecutives.length
                      ? '✓ Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                {/* Executives List */}
                <div className="space-y-4">
                  {filteredExecutives.map((executive) => (
                    <button
                      key={executive.id}
                      onClick={() => toggleExecutive(executive.id)}
                      className={`w-full p-6 rounded-xl border-4 text-left transition ${
                        selectedExecutiveIds.has(executive.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3
                              className={`text-2xl font-bold ${
                                selectedExecutiveIds.has(executive.id)
                                  ? 'text-blue-900'
                                  : 'text-gray-900'
                              }`}
                            >
                              {executive.name}
                            </h3>
                            {selectedExecutiveIds.has(executive.id) && (
                              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-lg text-gray-700 mt-2">{executive.title}</p>
                          {executive.company_name && (
                            <p className="text-gray-600 mt-1">🏢 {executive.company_name}</p>
                          )}
                        </div>
                        <div className="ml-4">
                          <input
                            type="checkbox"
                            checked={selectedExecutiveIds.has(executive.id)}
                            onChange={() => {}}
                            className="w-6 h-6 accent-blue-600"
                          />
                          {executive.linkedin_engagement_score && (
                            <div className="mt-3 text-right">
                              <p className="text-sm font-bold text-gray-600">LinkedIn</p>
                              <p className="text-lg font-bold text-blue-600">
                                {getEngagementBadge(
                                  executive.linkedin_engagement_score
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={handleGenerateStrategies}
                disabled={selectedExecutiveIds.size === 0 || loading}
                className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-bold text-lg"
              >
                🚀 Generate Strategies ({selectedExecutiveIds.size})
              </button>
              <Link href="/" className="flex-1">
                <button className="w-full px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg">
                  🏠 Home
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
