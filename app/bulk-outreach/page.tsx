'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BDProfile } from '@/lib/types'
import * as XLSX from 'xlsx'

interface Strategy {
  executiveId: string
  name: string
  title: string
  email: string
  strategies: any
}

interface BulkMessage {
  executiveName: string
  email: string
  title: string
  emailMessage: string
  linkedinMessage: string
  smsMessage: string
}

export default function BulkOutreachPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [profile, setProfile] = useState<BDProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [outreachPurpose, setOutreachPurpose] = useState('')
  const [generatedMessages, setGeneratedMessages] = useState<BulkMessage[]>([])
  const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input')
  const [generationProgress, setGenerationProgress] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const campaignData = localStorage.getItem('campaignData')
      if (!campaignData) {
        setMessage('❌ No campaign data found')
        return
      }

      const campaign = JSON.parse(campaignData)
      const messageData = localStorage.getItem('messageData')

      if (messageData) {
        setProfile(JSON.parse(messageData).profile)
      }

      const { data: execData } = await supabase
        .from('executives')
        .select('*')
        .in('id', campaign.selectedExecutiveIds)

      if (execData) {
        const strats = execData.map((exec) => ({
          executiveId: exec.id,
          name: exec.name,
          title: exec.title,
          email: exec.email || '',
          strategies: {
            primary: {
              type: 'linkedin',
              description: 'Connect on LinkedIn',
              reasoning: 'Build relationship first',
            },
          },
        }))
        setStrategies(strats)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage('❌ Error loading campaign data')
    }
  }

  const generateBulkMessages = async () => {
    if (!outreachPurpose.trim()) {
      setMessage('❌ Please enter the purpose of your outreach')
      return
    }

    if (strategies.length === 0) {
      setMessage('❌ No executives to generate messages for')
      return
    }

    try {
      setLoading(true)
      setStep('generating')
      setGeneratedMessages([]) // Start with empty array
      let allMessages: BulkMessage[] = []

      for (let i = 0; i < strategies.length; i++) {
        const exec = strategies[i]
        const progressPercent = Math.round((i / strategies.length) * 100)
        setGenerationProgress(progressPercent)
        setMessage(
          `🤖 Generating messages for ${exec.name} (${i + 1}/${strategies.length})...`
        )

        console.log(`Starting generation for ${exec.name}...`)

        try {
          // Generate email message
          console.log(`Fetching email message for ${exec.name}...`)
          const emailResponse = await fetch('/api/generate-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              executive: exec,
              strategy: exec.strategies,
              channel: 'email',
              bdProfile: profile,
              isVariant: false,
              messageContext: {
                contextType: 'none',
                documentName: '',
                documentContent: outreachPurpose,
              },
            }),
          })

          const emailData = await emailResponse.json()
          const emailMessage = emailData.messages?.original_message || 'Failed to generate'
          console.log(`Email message for ${exec.name}: ${emailMessage.substring(0, 50)}...`)

          // Generate LinkedIn message
          console.log(`Fetching LinkedIn message for ${exec.name}...`)
          const linkedinResponse = await fetch('/api/generate-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              executive: exec,
              strategy: exec.strategies,
              channel: 'linkedin',
              bdProfile: profile,
              isVariant: false,
              messageContext: {
                contextType: 'none',
                documentName: '',
                documentContent: outreachPurpose,
              },
            }),
          })

          const linkedinData = await linkedinResponse.json()
          const linkedinMessage = linkedinData.messages?.original_message || 'Failed to generate'
          console.log(
            `LinkedIn message for ${exec.name}: ${linkedinMessage.substring(0, 50)}...`
          )

          // Generate SMS message
          console.log(`Fetching SMS message for ${exec.name}...`)
          const smsResponse = await fetch('/api/generate-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              executive: exec,
              strategy: exec.strategies,
              channel: 'sms',
              bdProfile: profile,
              isVariant: false,
              messageContext: {
                contextType: 'none',
                documentName: '',
                documentContent: outreachPurpose,
              },
            }),
          })

          const smsData = await smsResponse.json()
          const smsMessage = smsData.messages?.original_message || 'Failed to generate'
          console.log(`SMS message for ${exec.name}: ${smsMessage.substring(0, 50)}...`)

          // Create message object
          const msgObj: BulkMessage = {
            executiveName: exec.name,
            email: exec.email,
            title: exec.title,
            emailMessage,
            linkedinMessage,
            smsMessage,
          }

          // Add to all messages array
          allMessages = [...allMessages, msgObj]
          console.log(`Total messages accumulated: ${allMessages.length}`)

          // Update state immediately so user can see progress
          setGeneratedMessages([...allMessages])
        } catch (error) {
          console.error(`Error generating for ${exec.name}:`, error)
          const msgObj: BulkMessage = {
            executiveName: exec.name,
            email: exec.email,
            title: exec.title,
            emailMessage: 'Error generating message',
            linkedinMessage: 'Error generating message',
            smsMessage: 'Error generating message',
          }
          allMessages = [...allMessages, msgObj]
          setGeneratedMessages([...allMessages])
        }
      }

      console.log(`Final total messages: ${allMessages.length}`)
      setGeneratedMessages(allMessages)
      setGenerationProgress(100)
      setStep('preview')
      setMessage('✅ Messages generated successfully!')
    } catch (error) {
      console.error('Error generating messages:', error)
      setMessage('❌ Error generating messages: ' + String(error))
      setStep('input')
    } finally {
      setLoading(false)
      setGenerationProgress(0)
    }
  }

  const downloadSpreadsheet = () => {
    if (generatedMessages.length === 0) {
      setMessage('❌ No messages to export')
      return
    }

    try {
      console.log(`Downloading ${generatedMessages.length} messages...`)
      const data = generatedMessages.map((msg) => ({
        'Executive Name': msg.executiveName,
        'Title': msg.title,
        'Email': msg.email,
        'Email Message': msg.emailMessage,
        'LinkedIn Message': msg.linkedinMessage,
        'SMS Message': msg.smsMessage,
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Outreach Messages')

      // Set column widths
      ws['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
        { wch: 60 },
        { wch: 60 },
        { wch: 40 },
      ]

      XLSX.writeFile(wb, 'bulk-outreach-messages.xlsx')
      setMessage('✅ Spreadsheet downloaded successfully!')
    } catch (error) {
      console.error('Error downloading spreadsheet:', error)
      setMessage('❌ Error downloading spreadsheet')
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl shadow-lg p-12 text-white">
          <h1 className="text-6xl font-bold mb-4">📊 Bulk Outreach Campaign</h1>
          <p className="text-2xl">
            Generate messages for {strategies.length} executives across all channels
          </p>
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

        {step === 'input' && (
          <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200 space-y-8">
            <h2 className="text-4xl font-bold text-gray-900">Step 1: Define Outreach Purpose</h2>

            <div>
              <label className="block text-2xl font-bold text-gray-900 mb-4">
                What's the purpose of this outreach campaign?
              </label>
              <textarea
                value={outreachPurpose}
                onChange={(e) => setOutreachPurpose(e.target.value)}
                placeholder="E.g., Introduce new product, request partnership discussion, share industry insights..."
                className="w-full px-6 py-4 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none h-32 resize-none"
              />
            </div>

            <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-6">
              <p className="text-lg font-bold text-blue-900">
                📋 {strategies.length} executives will receive personalized messages across Email, LinkedIn, and SMS
              </p>
            </div>

            <button
              onClick={generateBulkMessages}
              disabled={loading || !outreachPurpose.trim()}
              className="w-full px-8 py-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-bold text-2xl"
            >
              {loading ? '⏳ Generating Messages...' : '🚀 Generate All Messages'}
            </button>
          </div>
        )}

        {step === 'preview' && generatedMessages.length > 0 && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Step 2: Review & Export</h2>

              <div className="mb-8 bg-green-50 border-4 border-green-300 rounded-lg p-6">
                <p className="text-xl font-bold text-green-900">
                  ✅ Generated {generatedMessages.length} message sets (Email + LinkedIn + SMS for each executive)
                </p>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full border-4 border-gray-300">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="px-4 py-3 text-left font-bold text-lg">Executive</th>
                      <th className="px-4 py-3 text-left font-bold text-lg">Email</th>
                      <th className="px-4 py-3 text-left font-bold text-lg">Email Message (Preview)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedMessages.map((msg, idx) => (
                      <tr key={idx} className="border-t-4 border-gray-300">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900 text-lg">{msg.executiveName}</p>
                          <p className="text-gray-700">{msg.title}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{msg.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 text-sm">
                          {msg.emailMessage.substring(0, 150)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={downloadSpreadsheet}
                className="w-full px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-2xl mb-6"
              >
                📥 Download Spreadsheet (.xlsx)
              </button>

              <div className="flex gap-6">
                <button
                  onClick={() => {
                    setStep('input')
                    setOutreachPurpose('')
                    setGeneratedMessages([])
                  }}
                  className="flex-1 px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg"
                >
                  ← Start Over
                </button>
                <Link href="/strategies" className="flex-1">
                  <button className="w-full px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-lg">
                    🏠 Back to Strategies
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="text-center bg-white rounded-xl shadow-lg p-16 border-4 border-gray-200">
            <div className="animate-spin text-7xl mb-6">⏳</div>
            <p className="text-3xl text-gray-700 font-bold">{message}</p>
            {generatedMessages.length > 0 && (
              <div className="mt-8">
                <p className="text-2xl text-gray-700 font-bold mb-4">
                  Generated so far: {generatedMessages.length}/{strategies.length}
                </p>
                <div className="w-full bg-gray-300 rounded-full h-6 mb-4">
                  <div
                    className="bg-green-600 h-6 rounded-full transition-all"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
