'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BDProfile, Executive } from '@/lib/types'

interface Strategy {
  executiveId: string
  name: string
  title: string
  strategies: {
    primary: {
      type: string
      description: string
      reasoning: string
      successProbability: number
      effortLevel: string
      actionItems: string[]
    }
    secondary: {
      type: string
      description: string
      reasoning: string
      successProbability: number
      effortLevel: string
      actionItems: string[]
    }
    tertiary: {
      type: string
      description: string
      reasoning: string
      successProbability: number
      effortLevel: string
      actionItems: string[]
    }
  }
  overallConnectionStrength: number
  bestTimeToReach: string
}

const DEMO_USER_ID = 'demo-user-001'

export default function StrategiesPage() {
  const [profile, setProfile] = useState<BDProfile | null>(null)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [selectedExecutive, setSelectedExecutive] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const campaignData = localStorage.getItem('campaignData')
      if (!campaignData) {
        setMessage('❌ No campaign data found. Please select executives first.')
        setLoading(false)
        return
      }

      const campaign = JSON.parse(campaignData)

      const { data: profileData } = await supabase
        .from('bd_profiles')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .single()

      if (!profileData) {
        setMessage('❌ No profile found. Please create one first.')
        setLoading(false)
        return
      }

      setProfile(profileData)

      const { data: execData } = await supabase
        .from('executives')
        .select('*')
        .in('id', campaign.selectedExecutiveIds)

      if (!execData || execData.length === 0) {
        setMessage('❌ No executives found.')
        setLoading(false)
        return
      }

      await generateStrategies(profileData, execData)
    } catch (error) {
      console.error('Error:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      setMessage('❌ Error loading data: ' + errorMsg)
      setLoading(false)
    }
  }

  const generateStrategies = async (profile: BDProfile, executives: Executive[]) => {
    try {
      setMessage('🤖 Generating AI strategies...')

      const response = await fetch('/api/generate-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bdProfile: profile,
          executives: executives,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage('❌ Error: ' + (result.details || result.error || 'Unknown error'))
        setLoading(false)
        return
      }

      setStrategies(result.strategies || [])
      if (result.strategies && result.strategies.length > 0) {
        setSelectedExecutive(result.strategies[0])
      }
      setMessage('')
    } catch (error) {
      console.error('Strategy generation error:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      setMessage('❌ Error generating strategies: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case 'linkedin':
        return '🔗'
      case 'conference':
        return '🎯'
      case 'geographic':
        return '🌍'
      case 'multi_step':
        return '🔄'
      default:
        return '📍'
    }
  }

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'bg-green-200 text-green-900'
      case 'medium':
        return 'bg-yellow-200 text-yellow-900'
      case 'high':
        return 'bg-red-200 text-red-900'
      default:
        return 'bg-gray-200 text-gray-900'
    }
  }

  const StrategyCard = ({
    strategy,
    level,
  }: {
    strategy: any
    level: 'primary' | 'secondary' | 'tertiary'
  }) => (
    <div className="border-4 border-gray-300 rounded-xl p-6 mb-6 bg-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-bold text-2xl text-gray-900 flex items-center gap-3">
            {getStrategyIcon(strategy.type)}
            <span className="uppercase">{strategy.type}</span>
            {level === 'primary' && (
              <span className="text-sm bg-yellow-300 text-yellow-900 px-3 py-1 rounded-lg font-bold">
                🥇 BEST
              </span>
            )}
            {level === 'secondary' && (
              <span className="text-sm bg-gray-300 text-gray-900 px-3 py-1 rounded-lg font-bold">
                🥈 BACKUP
              </span>
            )}
            {level === 'tertiary' && (
              <span className="text-sm bg-gray-300 text-gray-900 px-3 py-1 rounded-lg font-bold">
                🥉 LAST
              </span>
            )}
          </h4>
          <p className="text-lg text-gray-700 mt-3">{strategy.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6 bg-gray-50 p-4 rounded-lg">
        <div>
          <p className="text-sm font-bold text-gray-600 uppercase">Success Rate</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{strategy.successProbability}%</p>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-600 uppercase">Effort Required</p>
          <span className={`inline-block px-4 py-2 rounded-lg text-lg font-bold mt-2 ${getEffortColor(strategy.effortLevel)}`}>
            {strategy.effortLevel.toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-600 uppercase">ROI Score</p>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {(
              strategy.successProbability /
              (strategy.effortLevel === 'low' ? 1 : strategy.effortLevel === 'medium' ? 1.5 : 2)
            ).toFixed(0)}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-lg font-bold text-gray-900 mb-3">Why This Approach:</p>
        <p className="text-lg text-gray-800 italic bg-blue-50 p-4 rounded-lg">
          {strategy.reasoning}
        </p>
      </div>

      <div>
        <p className="text-lg font-bold text-gray-900 mb-3">Action Steps:</p>
        <ol className="text-lg space-y-2">
          {strategy.actionItems.map((item: string, idx: number) => (
            <li key={idx} className="text-gray-800 flex items-start gap-3">
              <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                {idx + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-5xl font-bold mb-3">🚀 Connection Strategies</h1>
          <p className="text-xl">
            AI-generated personalized strategies to reach {strategies.length} executives
          </p>
        </div>

        {message && (
          <div
            className={`p-6 rounded-xl text-xl font-bold ${
              message.includes('Error') || message.includes('❌')
                ? 'bg-red-100 text-red-900 border-4 border-red-300'
                : 'bg-blue-100 text-blue-900 border-4 border-blue-300'
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center bg-white rounded-xl shadow-lg p-12">
            <div className="animate-spin text-6xl mb-6">⏳</div>
            <p className="text-2xl text-gray-700 font-bold">Generating strategies with Claude AI...</p>
          </div>
        ) : strategies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-2xl text-gray-700">No strategies generated</p>
            <Link href="/select">
              <button className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg">
                ← Go Back
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Executive List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
                <h2 className="font-bold text-2xl mb-6 text-gray-900">📋 Executives</h2>
                <div className="text-lg font-bold text-gray-600 mb-4 bg-gray-100 px-3 py-2 rounded">
                  {strategies.length} Total
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {strategies.map((strategy) => (
                    <button
                      key={strategy.executiveId}
                      onClick={() => setSelectedExecutive(strategy)}
                      className={`w-full text-left p-4 rounded-lg border-4 transition ${
                        selectedExecutive?.executiveId === strategy.executiveId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-blue-400'
                      }`}
                    >
                      <p className="font-bold text-lg text-gray-900">{strategy.name}</p>
                      <p className="text-sm text-gray-700 mt-1">{strategy.title}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="w-full bg-gray-300 rounded-full h-3 mr-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full"
                            style={{ width: `${strategy.overallConnectionStrength}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          {strategy.overallConnectionStrength}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategy Details */}
            <div className="lg:col-span-3">
              {selectedExecutive && (
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <div className="mb-8 pb-6 border-b-4 border-gray-200">
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">
                      {selectedExecutive.name}
                    </h2>
                    <p className="text-2xl text-gray-700 mb-6">{selectedExecutive.title}</p>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <p className="text-sm font-bold text-gray-600 uppercase mb-3">
                          Connection Strength
                        </p>
                        <div className="w-full bg-gray-300 rounded-full h-4 mb-3">
                          <div
                            className="bg-green-600 h-4 rounded-full"
                            style={{ width: `${selectedExecutive.overallConnectionStrength}%` }}
                          />
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {selectedExecutive.overallConnectionStrength}% Match
                        </p>
                      </div>
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <p className="text-sm font-bold text-gray-600 uppercase mb-3">
                          Best Time to Reach
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedExecutive.bestTimeToReach}
                        </p>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-bold text-3xl mb-8 text-gray-900">Connection Strategies</h3>

                  <StrategyCard strategy={selectedExecutive.strategies.primary} level="primary" />
                  <StrategyCard strategy={selectedExecutive.strategies.secondary} level="secondary" />
                  <StrategyCard strategy={selectedExecutive.strategies.tertiary} level="tertiary" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        {!loading && strategies.length > 0 && (
          <div className="flex gap-4 mt-8">
            <Link href="/select" className="flex-1">
              <button className="w-full px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg">
                ← Select Different Executives
              </button>
            </Link>
            <Link href="/" className="flex-1">
              <button className="w-full px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg">
                🏠 Home
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
