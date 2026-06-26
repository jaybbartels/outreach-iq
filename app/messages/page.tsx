'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BDProfile } from '@/lib/types'

interface GeneratedMessages {
  channel: string
  original_message: string
  follow_ups: {
    no_response_3days: string
    no_response_7days: string
    soft_response: string
    interested: string
  }
  tips: string[]
}

interface ExecutiveData {
  id: string
  name: string
  title: string
  strategies: any
  overallConnectionStrength: number
  bestTimeToReach: string
}

export default function MessagesPage() {
  const [executive, setExecutive] = useState<ExecutiveData | null>(null)
  const [profile, setProfile] = useState<BDProfile | null>(null)
  const [messageContext, setMessageContext] = useState<any>(null)
  const [selectedChannel, setSelectedChannel] = useState('email')
  const [messages, setMessages] = useState<GeneratedMessages | null>(null)
  const [variants, setVariants] = useState<GeneratedMessages[]>([])
  const [selectedVariant, setSelectedVariant] = useState<GeneratedMessages | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [newObjective, setNewObjective] = useState('')
  const [messageCache, setMessageCache] = useState<{ [key: string]: GeneratedMessages }>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const messageData = localStorage.getItem('messageData')
      if (!messageData) {
        setMessage('❌ No message data found. Please generate strategies first.')
        return
      }

      const data = JSON.parse(messageData)
      
      console.log('Loaded messageData:', data)

      if (!data.executive || !data.executive.id) {
        setMessage('❌ Invalid executive data. Please regenerate strategies.')
        return
      }

      setExecutive(data.executive)
      setProfile(data.profile)

      // Load message context if available
      const contextData = localStorage.getItem('messageContext')
      if (contextData) {
        setMessageContext(JSON.parse(contextData))
      }

      // Load messages from database
      await loadMessagesFromDB(data.executive, 'email')
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Error loading data: ' + String(error))
    }
  }

  const loadMessagesFromDB = async (exec: ExecutiveData, channel: string) => {
    try {
      setLoading(true)
      console.log(`📥 Loading ${channel} messages for executive:`, exec)

      // Check cache first
      if (messageCache[channel]) {
        console.log(`✅ Found ${channel} in cache`)
        setMessages(messageCache[channel])
        setSelectedVariant(null)
        return
      }

      // Query by name since ID might be a slug, not a UUID
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('executive_name', exec.name)
        .eq('channel', channel)

      console.log(`Database query result:`, messageData, messageError)

      if (messageError) {
        console.error('Database error:', messageError)
        // If that fails, try by ID anyway
        console.log('Trying alternate query by executive_id...')
        const { data: altData, error: altError } = await supabase
          .from('messages')
          .select('*')
          .eq('executive_id', exec.id)
          .eq('channel', channel)
        
        if (altError) {
          throw altError
        }
        
        if (altData && altData.length > 0) {
          const dbMessage = altData[0]
          const msgObj = {
            channel,
            original_message: dbMessage.original_message,
            follow_ups: dbMessage.follow_ups,
            tips: dbMessage.tips || [],
          }
          setMessages(msgObj)
          setMessageCache({ ...messageCache, [channel]: msgObj })
          return
        }
      }

      if (messageData && messageData.length > 0) {
        // Found in DB - use it
        const dbMessage = messageData[0]
        console.log(`✅ Found ${channel} in database`)

        const msgObj = {
          channel,
          original_message: dbMessage.original_message,
          follow_ups: dbMessage.follow_ups,
          tips: dbMessage.tips || [],
        }

        setMessages(msgObj)
        setMessageCache({ ...messageCache, [channel]: msgObj })

        // Load variants
        const { data: variantData } = await supabase
          .from('message_variants')
          .select('*')
          .eq('message_id', dbMessage.id)
          .order('variant_number')

        if (variantData && variantData.length > 0) {
          console.log(`Found ${variantData.length} variants`)
          setVariants(
            variantData.map((v: any) => ({
              channel,
              original_message: v.original_message,
              follow_ups: v.follow_ups,
              tips: v.tips || [],
              objective: v.objective,
            }))
          )
        } else {
          setVariants([])
        }
      } else {
        // Not in DB - need to generate
        console.log(`❌ ${channel} not found in database, generating new...`)
        if (executive && profile) {
          await generateMessages(executive, profile, channel)
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessage('❌ Error loading messages: ' + String(error))
    } finally {
      setLoading(false)
    }
  }

  const generateMessages = async (exec: ExecutiveData, prof: BDProfile, channel: string) => {
    try {
      setLoading(true)
      setMessage('🤖 Generating messages...')
      console.log(`🔧 Generating ${channel} messages...`)

      const response = await fetch('/api/generate-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executive: exec,
          strategy: exec.strategies,
          channel,
          bdProfile: prof,
          isVariant: false,
          messageContext: messageContext,
        }),
      })

      const result = await response.json()
      console.log('Generate response:', result)

      if (!response.ok) {
        setMessage('❌ Error: ' + (result.details || result.error))
        return
      }

      setMessages(result.messages)
      setMessageCache({ ...messageCache, [channel]: result.messages })
      setSelectedVariant(null)
      setVariants([])
      setMessage('')
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Error generating messages: ' + String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleChannelChange = async (channel: string) => {
    console.log(`Switching to ${channel}...`)
    setSelectedChannel(channel)
    setSelectedVariant(null)
    setShowVariantForm(false)
    if (executive) {
      await loadMessagesFromDB(executive, channel)
    }
  }

  const handleGenerateVariant = async () => {
    if (!newObjective.trim()) {
      setMessage('❌ Please enter an objective for the variant')
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/generate-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executive,
          strategy: executive?.strategies,
          channel: selectedChannel,
          bdProfile: profile,
          isVariant: true,
          objective: newObjective,
          messageContext: messageContext,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage('❌ Error: ' + (result.details || result.error))
        return
      }

      // Add to variants list
      setVariants([
        ...variants,
        {
          channel: selectedChannel,
          original_message: result.messages.original_message,
          follow_ups: result.messages.follow_ups,
          tips: result.messages.tips || [],
        },
      ])

      setNewObjective('')
      setShowVariantForm(false)
      setMessage('✅ Variant generated!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Error generating variant')
    } finally {
      setLoading(false)
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return '✉️'
      case 'linkedin':
        return '🔗'
      case 'sms':
        return '💬'
      default:
        return '📧'
    }
  }

  const displayMessages = selectedVariant || messages

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-5xl font-bold mb-3">✉️ Outreach Messages</h1>
          <p className="text-xl">
            Customized messages per channel with follow-up sequences
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

        {executive && profile ? (
          <>
            {/* Executive Info */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-bold text-gray-600 uppercase mb-2">Executive</p>
                  <h2 className="text-3xl font-bold text-gray-900">{executive.name}</h2>
                  <p className="text-xl text-gray-700 mt-1">{executive.title}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-600 uppercase mb-2">Sending From</p>
                  <h3 className="text-3xl font-bold text-gray-900">{profile.name}</h3>
                  <p className="text-xl text-gray-700 mt-1">{profile.title || 'Business Development'}</p>
                </div>
              </div>
            </div>

            {/* Message Context Info */}
            {messageContext && messageContext.contextType !== 'none' && (
              <div className="bg-blue-50 border-4 border-blue-300 rounded-xl p-6">
                <p className="text-lg font-bold text-blue-900">
                  📋 Using {messageContext.contextType.toUpperCase()} context
                </p>
                <p className="text-blue-800 mt-1">Document: {messageContext.documentName}</p>
              </div>
            )}

            {/* Channel Selection */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Select Channel</h3>
              <div className="grid grid-cols-3 gap-4">
                {['email', 'linkedin', 'sms'].map((channel) => (
                  <button
                    key={channel}
                    onClick={() => handleChannelChange(channel)}
                    disabled={loading}
                    className={`p-6 rounded-lg border-4 text-center transition disabled:opacity-50 ${
                      selectedChannel === channel
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="text-4xl mb-2">{getChannelIcon(channel)}</div>
                    <p className="font-bold text-lg text-gray-900 capitalize">{channel}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            {loading ? (
              <div className="text-center bg-white rounded-xl shadow-lg p-12">
                <div className="animate-spin text-6xl mb-6">⏳</div>
                <p className="text-2xl text-gray-700 font-bold">Loading messages...</p>
              </div>
            ) : displayMessages ? (
              <div className="space-y-6">
                {/* Variant Indicator */}
                {selectedVariant && (
                  <div className="bg-purple-100 border-4 border-purple-300 rounded-xl p-4">
                    <p className="text-lg font-bold text-purple-900">
                      📝 Viewing Alternative: {variants.indexOf(selectedVariant) + 1}
                    </p>
                  </div>
                )}

                {/* Original Message */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    🎯 Initial Outreach Message
                  </h3>
                  <div className="bg-blue-50 p-6 rounded-lg border-4 border-blue-200">
                    <p className="text-lg text-gray-900 whitespace-pre-wrap">
                      {displayMessages.original_message}
                    </p>
                  </div>
                </div>

                {/* Follow-ups */}
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    📨 Follow-up Messages
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">⏰</span>
                        <h4 className="text-xl font-bold text-gray-900">If No Response (3 Days)</h4>
                      </div>
                      <div className="bg-yellow-50 p-6 rounded-lg border-4 border-yellow-200">
                        <p className="text-lg text-gray-900 whitespace-pre-wrap">
                          {displayMessages.follow_ups.no_response_3days}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">⏰⏰</span>
                        <h4 className="text-xl font-bold text-gray-900">If No Response (7 Days)</h4>
                      </div>
                      <div className="bg-orange-50 p-6 rounded-lg border-4 border-orange-200">
                        <p className="text-lg text-gray-900 whitespace-pre-wrap">
                          {displayMessages.follow_ups.no_response_7days}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🤔</span>
                        <h4 className="text-xl font-bold text-gray-900">If Soft Response</h4>
                      </div>
                      <div className="bg-purple-50 p-6 rounded-lg border-4 border-purple-200">
                        <p className="text-lg text-gray-900 whitespace-pre-wrap">
                          {displayMessages.follow_ups.soft_response}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🎉</span>
                        <h4 className="text-xl font-bold text-gray-900">If Interested</h4>
                      </div>
                      <div className="bg-green-50 p-6 rounded-lg border-4 border-green-200">
                        <p className="text-lg text-gray-900 whitespace-pre-wrap">
                          {displayMessages.follow_ups.interested}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                {displayMessages.tips && displayMessages.tips.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">💡 Tips for Success</h3>
                    <ul className="space-y-3">
                      {displayMessages.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-2xl">✓</span>
                          <span className="text-lg text-gray-900">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Variants */}
                {variants.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      📝 Alternative Versions ({variants.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {variants.map((variant, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedVariant(variant)}
                          className={`p-4 rounded-lg border-4 text-left transition ${
                            selectedVariant === variant
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-300 bg-white hover:border-purple-400'
                          }`}
                        >
                          <p className="font-bold text-gray-900">Version {idx + 1}</p>
                          <p className="text-sm text-gray-700 mt-1">{(variant as any).objective || 'Alternative version'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate Variant Form */}
                {!showVariantForm ? (
                  <button
                    onClick={() => setShowVariantForm(true)}
                    className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg"
                  >
                    ➕ Generate Alternative Message
                  </button>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Create New Variant</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-lg font-bold text-gray-900 mb-2">
                          What's the objective of this variant?
                        </label>
                        <input
                          type="text"
                          value={newObjective}
                          onChange={(e) => setNewObjective(e.target.value)}
                          placeholder="e.g., More urgent, More casual, Focus on ROI, Technical angle"
                          className="w-full px-4 py-3 text-lg text-gray-900 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={handleGenerateVariant}
                          disabled={loading}
                          className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-lg disabled:opacity-50"
                        >
                          {loading ? '⏳ Generating...' : '✨ Generate'}
                        </button>
                        <button
                          onClick={() => setShowVariantForm(false)}
                          className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-bold text-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Buttons */}
            <div className="flex gap-4">
              <Link href="/strategies" className="flex-1">
                <button className="w-full px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg">
                  ← Back to Strategies
                </button>
              </Link>
              <Link href="/" className="flex-1">
                <button className="w-full px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg">
                  🏠 Home
                </button>
              </Link>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-2xl text-gray-700 mb-6">No executive selected</p>
            <Link href="/strategies">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg">
                ← Back to Strategies
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
