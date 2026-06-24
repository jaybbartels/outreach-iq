'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Collection, Executive } from '@/lib/types'

export default function SelectPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [executives, setExecutives] = useState<Executive[]>([])
  const [selectedExecutives, setSelectedExecutives] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadCollections()
  }, [])

  useEffect(() => {
    if (selectedCollection) {
      loadExecutives()
    }
  }, [selectedCollection])

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('name')

      if (!error && data) {
        setCollections(data)
      }
    } catch (error) {
      console.error('Error loading collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExecutives = async () => {
    if (!selectedCollection) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('collection_executives')
        .select('executive_id, executives(*)')
        .eq('collection_id', selectedCollection.id)

      if (!error && data) {
        const execs = data
          .map((row: any) => row.executives)
          .filter((e: any) => e !== null)
        setExecutives(execs)
      }
    } catch (error) {
      console.error('Error loading executives:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectExecutive = (execId: string) => {
    const newSelected = new Set(selectedExecutives)
    if (newSelected.has(execId)) {
      newSelected.delete(execId)
    } else {
      newSelected.add(execId)
    }
    setSelectedExecutives(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedExecutives.size === executives.length) {
      setSelectedExecutives(new Set())
    } else {
      setSelectedExecutives(new Set(executives.map((e) => e.id || '')))
    }
  }

  const handleStartCampaign = () => {
    if (!selectedCollection || selectedExecutives.size === 0) {
      setMessage('❌ Please select a collection and at least one executive')
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-6">🎯 Select Targets</h1>
        <p className="text-gray-600 mb-6">
          Choose a collection and select the executives you want to target
        </p>

        {/* Collections */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Step 1: Choose Collection</h2>

          {loading ? (
            <div className="text-gray-500">Loading collections...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    setSelectedCollection(collection)
                    setSelectedExecutives(new Set())
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    selectedCollection?.id === collection.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{collection.icon}</div>
                  <h3 className="font-bold text-lg">{collection.name}</h3>
                  {collection.description && (
                    <p className="text-sm text-gray-600">{collection.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Executives */}
        {selectedCollection && (
          <div>
            <h2 className="text-xl font-bold mb-4">
              Step 2: Select Executives
              <span className="text-blue-600 ml-2">
                ({selectedExecutives.size} selected)
              </span>
            </h2>

            {loading ? (
              <div className="text-gray-500">Loading executives...</div>
            ) : executives.length === 0 ? (
              <div className="text-gray-500 bg-gray-50 p-4 rounded">
                No executives found in {selectedCollection.name}. Please research them first in System 1.
              </div>
            ) : (
              <>
                <button
                  onClick={handleSelectAll}
                  className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  {selectedExecutives.size === executives.length
                    ? 'Deselect All'
                    : 'Select All'}{' '}
                  ({executives.length})
                </button>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {executives.map((exec) => (
                    <button
                      key={exec.id}
                      onClick={() => handleSelectExecutive(exec.id || '')}
                      className={`w-full p-4 rounded-lg border-2 text-left transition ${
                        selectedExecutives.has(exec.id || '')
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{exec.name}</h3>
                          <p className="text-sm text-gray-600">{exec.title}</p>
                          {exec.confidence_level && (
                            <p className="text-xs text-gray-500 mt-1">
                              {exec.confidence_level === 'high' && '✅'}
                              {exec.confidence_level === 'medium' && '⚠️'}
                              {exec.confidence_level === 'low' && '❌'} {exec.confidence_level}
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            selectedExecutives.has(exec.id || '')
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedExecutives.has(exec.id || '') && (
                            <span className="text-white">✓</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-lg">{message}</div>
        )}

        {/* Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={handleStartCampaign}
            disabled={!selectedCollection || selectedExecutives.size === 0}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
          >
            🚀 Generate Strategies ({selectedExecutives.size})
          </button>
          <Link href="/">
            <button className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-bold">
              ← Back
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
