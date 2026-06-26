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
  const [selectedExecutives, setSelectedExecutives] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // Filter states
  const [nameFilter, setNameFilter] = useState('')
  const [titleFilter, setTitleFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [engagementFilter, setEngagementFilter] = useState('all')

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      const { data } = await supabase
        .from('collections')
        .select('*')
        .order('name')

      setCollections(data || [])
    } catch (error) {
      setMessage('❌ Error loading collections: ' + String(error))
    } finally {
      setLoading(false)
    }
  }

  const loadExecutives = async (collectionId: string) => {
    try {
      setLoading(true)
      setMessage('')
      setNameFilter('')
      setTitleFilter('')
      setCompanyFilter('')
      setEngagementFilter('all')
      setSelectedExecutives(new Set())

      const { data: collectionExecs } = await supabase
        .from('collection_executives')
        .select('executive_id')
        .eq('collection_id', collectionId)

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
      setMessage('❌ Error loading executives: ' + String(error))
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = executives

    // Name filter
    if (nameFilter.trim()) {
      filtered = filtered.filter((exec) =>
        exec.name.toLowerCase().includes(nameFilter.toLowerCase())
      )
    }

    // Title filter
    if (titleFilter.trim()) {
      filtered = filtered.filter((exec) =>
        exec.title.toLowerCase().includes(titleFilter.toLowerCase())
      )
    }

    // Company filter
    if (companyFilter.trim()) {
      filtered = filtered.filter((exec) =>
        (exec.company_name || '').toLowerCase().includes(companyFilter.toLowerCase())
      )
    }

    // Engagement filter
    if (engagementFilter !== 'all') {
      filtered = filtered.filter((exec) => {
        const engagement = exec.linkedin_engagement_score || 0
        if (engagementFilter === 'high') return engagement >= 70
        if (engagementFilter === 'medium') return engagement >= 40 && engagement < 70
        if (engagementFilter === 'low') return engagement < 40
        return true
      })
    }

    setFilteredExecutives(filtered)
  }

  useEffect(() => {
    applyFilters()
  }, [nameFilter, titleFilter, companyFilter, engagementFilter, executives])

  const toggleExecutive = (execId: string) => {
    const newSelected = new Set(selectedExecutives)
    if (newSelected.has(execId)) {
      newSelected.delete(execId)
    } else {
      newSelected.add(execId)
    }
    setSelectedExecutives(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedExecutives.size === filteredExecutives.length) {
      setSelectedExecutives(new Set())
    } else {
      setSelectedExecutives(new Set(filteredExecutives.map((e) => e.id)))
    }
  }

  const handleGenerateStrategies = () => {
    if (selectedExecutives.size === 0) {
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
        selectedExecutiveIds: Array.from(selectedExecutives),
        selectedCount: selectedExecutives.size,
      })
    )

    window.location.href = '/strategies'
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-5xl font-bold mb-3">🎯 Select Executives</h1>
          <p className="text-xl">
            Choose which executives to target for your outreach campaign
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Collections Sidebar */}
          <div className="bg-white rounded-xl shadow-lg p-6 h-fit sticky top-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 Collections</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    setSelectedCollection(collection)
                    loadExecutives(collection.id)
                  }}
                  className={`w-full text-left p-4 rounded-lg border-4 transition ${
                    selectedCollection?.id === collection.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-blue-400'
                  }`}
                >
                  <p className="font-bold text-lg text-gray-900">{collection.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {collection.description || 'No description'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedCollection ? (
              <>
                {/* Filters */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">🔍 Filter Executives</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name Filter */}
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        placeholder="Search by name..."
                        className="w-full px-4 py-3 text-lg text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Title Filter */}
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={titleFilter}
                        onChange={(e) => setTitleFilter(e.target.value)}
                        placeholder="Search by title..."
                        className="w-full px-4 py-3 text-lg text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Company Filter */}
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        placeholder="Search by company..."
                        className="w-full px-4 py-3 text-lg text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Engagement Filter */}
                    <div>
                      <label className="block text-lg font-bold text-gray-900 mb-2">
                        LinkedIn Engagement
                      </label>
                      <select
                        value={engagementFilter}
                        onChange={(e) => setEngagementFilter(e.target.value)}
                        className="w-full px-4 py-3 text-lg text-gray-900 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="all">All Levels</option>
                        <option value="high">High (70+)</option>
                        <option value="medium">Medium (40-69)</option>
                        <option value="low">Low (&lt;40)</option>
                      </select>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <button
                    onClick={() => {
                      setNameFilter('')
                      setTitleFilter('')
                      setCompanyFilter('')
                      setEngagementFilter('all')
                    }}
                    className="mt-6 px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-bold"
                  >
                    Clear All Filters
                  </button>
                </div>

                {/* Results */}
                {loading ? (
                  <div className="text-center bg-white rounded-xl shadow-lg p-12">
                    <div className="animate-spin text-6xl mb-6">⏳</div>
                    <p className="text-2xl text-gray-700 font-bold">Loading executives...</p>
                  </div>
                ) : filteredExecutives.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                    <p className="text-2xl text-gray-700 font-bold mb-4">No executives found</p>
                    <p className="text-gray-600">Try adjusting your filters</p>
                  </div>
                ) : (
                  <>
                    {/* Results Header */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            📊 {filteredExecutives.length} of {executives.length} Executives
                          </p>
                          <p className="text-gray-700 mt-1">
                            {selectedExecutives.size} selected
                          </p>
                        </div>
                        <button
                          onClick={toggleSelectAll}
                          className={`px-6 py-3 rounded-lg font-bold text-lg transition ${
                            selectedExecutives.size === filteredExecutives.length
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                          }`}
                        >
                          {selectedExecutives.size === filteredExecutives.length
                            ? '✓ Deselect All'
                            : 'Select All'}
                        </button>
                      </div>
                    </div>

                    {/* Executives Grid */}
                    <div className="grid grid-cols-1 gap-4">
                      {filteredExecutives.map((executive) => (
                        <div
                          key={executive.id}
                          className={`rounded-lg border-4 p-6 cursor-pointer transition ${
                            selectedExecutives.has(executive.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 bg-white hover:border-blue-400'
                          }`}
                          onClick={() => toggleExecutive(executive.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <p className="text-2xl font-bold text-gray-900">
                                  {executive.name}
                                </p>
                                {selectedExecutives.has(executive.id) && (
                                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                                    ✓ Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-lg text-gray-700 mt-2">{executive.title}</p>
                              {executive.company_name && (
                                <p className="text-gray-600 mt-1">🏢 {executive.company_name}</p>
                              )}
                            </div>
                            <div className="ml-4 text-right">
                              {executive.linkedin_engagement_score && (
                                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                                  <p className="text-sm font-bold text-gray-600">LinkedIn Engagement</p>
                                  <p className="text-2xl font-bold text-blue-600">
                                    {executive.linkedin_engagement_score}%
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleGenerateStrategies}
                    disabled={selectedExecutives.size === 0 || loading}
                    className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-bold text-lg"
                  >
                    🚀 Generate Strategies ({selectedExecutives.size})
                  </button>
                  <Link href="/" className="flex-1">
                    <button className="w-full px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg">
                      🏠 Home
                    </button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-2xl text-gray-700 font-bold mb-4">Select a collection to begin</p>
                <p className="text-gray-600">Choose a collection from the left to see executives</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
