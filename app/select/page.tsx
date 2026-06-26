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

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState('all')

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
      resetFilters()
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

  const resetFilters = () => {
    setSearchQuery('')
    setCompanyFilter('')
    setTitleFilter('')
    setConfidenceFilter('all')
  }

  // Apply filters whenever any filter changes
  useEffect(() => {
    let filtered = executives

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (exec) =>
          exec.name.toLowerCase().includes(query) ||
          (exec.email || '').toLowerCase().includes(query)
      )
    }

    // Company filter
    if (companyFilter.trim()) {
      filtered = filtered.filter((exec) =>
        (exec.company_name || '').toLowerCase().includes(companyFilter.toLowerCase())
      )
    }

    // Title filter
    if (titleFilter.trim()) {
      filtered = filtered.filter((exec) =>
        exec.title.toLowerCase().includes(titleFilter.toLowerCase())
      )
    }

    // Confidence filter (using linkedin_engagement_score as confidence)
    if (confidenceFilter !== 'all') {
      filtered = filtered.filter((exec) => {
        const confidence = exec.linkedin_engagement_score ?? 0
        if (confidenceFilter === 'high') return confidence >= 70
        if (confidenceFilter === 'medium') return confidence >= 40 && confidence < 70
        if (confidenceFilter === 'low') return confidence < 40
        return true
      })
    }

    setFilteredExecutives(filtered)
  }, [searchQuery, companyFilter, titleFilter, confidenceFilter, executives])

  const toggleExecutive = (id: string) => {
    const newSelected = new Set(selectedExecutiveIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedExecutiveIds(newSelected)
  }

  const toggleSelectAll = () => {
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

  const getConfidenceBadge = (score: number | null | undefined) => {
    const confidence = score ?? 0
    if (confidence >= 70) return { label: '✅ High', color: 'bg-green-200 text-green-900' }
    if (confidence >= 40) return { label: '⚠️ Medium', color: 'bg-yellow-200 text-yellow-900' }
    return { label: '❌ Low', color: 'bg-red-200 text-red-900' }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-12 text-white">
          <h1 className="text-6xl font-bold mb-4">🎯 Select Executive Targets</h1>
          <p className="text-2xl">Choose executives for your outreach campaign</p>
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

        {/* Step 1: Choose Collection */}
        <div className="space-y-6">
          <h2 className="text-5xl font-bold text-gray-900">Step 1: Choose Collection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => selectCollection(collection)}
                className={`p-8 rounded-xl border-4 text-left transition transform hover:scale-105 ${
                  selectedCollection?.id === collection.id
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-300 bg-white hover:border-blue-400'
                }`}
              >
                <div className="text-6xl mb-4">
                  {collection.name.includes('Healthcare') ? '🏥' : '🤖'}
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {collection.name}
                </h3>
                <p className="text-lg text-gray-700">
                  {collection.description || 'Migrated from domains'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Executives */}
        {selectedCollection && (
          <div className="space-y-8">
            <h2 className="text-5xl font-bold text-gray-900">
              Step 2: Select Executives{' '}
              <span className="text-blue-600">({selectedExecutiveIds.size} selected)</span>
            </h2>

            {/* Filter Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-4 border-gray-200">
              <h3 className="text-3xl font-bold text-gray-900 mb-8">🔍 Filter Executives</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Search */}
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Name or Email
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full px-4 py-3 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Company
                  </label>
                  <input
                    type="text"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    placeholder="Filter by company..."
                    className="w-full px-4 py-3 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Title
                  </label>
                  <input
                    type="text"
                    value={titleFilter}
                    onChange={(e) => setTitleFilter(e.target.value)}
                    placeholder="Filter by title..."
                    className="w-full px-4 py-3 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Confidence */}
                <div>
                  <label className="block text-lg font-bold text-gray-900 mb-3">
                    Confidence Level
                  </label>
                  <select
                    value={confidenceFilter}
                    onChange={(e) => setConfidenceFilter(e.target.value)}
                    className="w-full px-4 py-3 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All Levels</option>
                    <option value="high">High (70+)</option>
                    <option value="medium">Medium (40-69)</option>
                    <option value="low">Low (&lt;40)</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || companyFilter || titleFilter || confidenceFilter !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="mt-6 px-6 py-3 bg-gray-400 hover:bg-gray-500 text-gray-900 rounded-lg font-bold text-lg"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Results */}
            {loading ? (
              <div className="text-center bg-white rounded-xl shadow-lg p-16 border-4 border-gray-200">
                <div className="animate-spin text-7xl mb-6">⏳</div>
                <p className="text-3xl text-gray-700 font-bold">Loading executives...</p>
              </div>
            ) : filteredExecutives.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-16 text-center border-4 border-gray-200">
                <p className="text-3xl text-gray-700 font-bold mb-6">
                  {searchQuery || companyFilter || titleFilter || confidenceFilter !== 'all'
                    ? '❌ No executives match your filters'
                    : '❌ No executives in this collection'}
                </p>
                {(searchQuery || companyFilter || titleFilter || confidenceFilter !== 'all') && (
                  <button
                    onClick={resetFilters}
                    className="mt-6 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Select All / Results Info */}
                <div className="bg-white rounded-xl shadow-lg p-6 border-4 border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-900">
                      📊 Showing {filteredExecutives.length} of {executives.length} executives
                    </p>
                    <button
                      onClick={toggleSelectAll}
                      className={`px-8 py-3 rounded-lg font-bold text-lg transition ${
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
                </div>

                {/* Executives List */}
                <div className="space-y-4">
                  {filteredExecutives.map((executive) => {
                    const confidenceBadge = getConfidenceBadge(
                      executive.linkedin_engagement_score
                    )
                    return (
                      <button
                        key={executive.id}
                        onClick={() => toggleExecutive(executive.id)}
                        className={`w-full p-6 rounded-xl border-4 text-left transition ${
                          selectedExecutiveIds.has(executive.id)
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <h3 className="text-2xl font-bold text-gray-900">
                                {executive.name}
                              </h3>
                              {selectedExecutiveIds.has(executive.id) && (
                                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-lg font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                            <p className="text-xl text-gray-700 mt-2 font-semibold">
                              {executive.title}
                            </p>
                            {executive.company_name && (
                              <p className="text-gray-600 mt-2 text-lg">
                                🏢 {executive.company_name}
                              </p>
                            )}
                            {executive.email && (
                              <p className="text-gray-600 mt-1 text-lg">
                                ✉️ {executive.email}
                              </p>
                            )}
                          </div>
                          <div className="ml-6 flex flex-col items-end gap-4">
                            <input
                              type="checkbox"
                              checked={selectedExecutiveIds.has(executive.id)}
                              onChange={() => {}}
                              className="w-7 h-7 accent-blue-600 cursor-pointer"
                            />
                            <span
                              className={`px-4 py-2 rounded-lg font-bold text-lg ${confidenceBadge.color}`}
                            >
                              {confidenceBadge.label}
                            </span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-6 pt-6">
              <button
                onClick={handleGenerateStrategies}
                disabled={selectedExecutiveIds.size === 0 || loading}
                className="flex-1 px-8 py-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-bold text-2xl"
              >
                🚀 Generate Strategies ({selectedExecutiveIds.size})
              </button>
              <Link href="/" className="flex-1">
                <button className="w-full px-8 py-6 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-2xl">
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
