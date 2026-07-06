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
  executiveId: string
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
  const [campaignName, setCampaignName] = useState('')
  const [generatedMessages, setGeneratedMessages] = useState<BulkMessage[]>([])
  const [step, setStep] = useState<'input' | 'generating' | 'preview'>('input')
  const [progressLog, setProgressLog] = useState<string[]>([])
  const [savingToDB, setSavingToDB] = useState(false)

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
        .select('id, name, title, email')
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
        setCampaignName(`Campaign - ${new Date().toLocaleDateString()}`)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage('❌ Error loading campaign data')
    }
  }

  const addLog = (text: string) => {
    setProgressLog((prev) => [...prev, text])
    console.log(text)
  }

  const generateBulkMessages = async () => {
    if (!outreachPurpose.trim()) {
      setMessage('❌ Please enter the purpose of your outreach')
      return
    }

    if (!campaignName.trim()) {
      setMessage('❌ Please enter a campaign name')
      return
    }

    if (strategies.length === 0) {
      setMessage('❌ No executives to generate messages for')
      return
    }

    try {
      setLoading(true)
      setStep('generating')
      setProgressLog([])
      setGeneratedMessages([])
      addLog(`🚀 Starting message generation for ${strategies.length} executives...\n`)

      for (let i = 0; i < strategies.length; i++) {
        const exec = strategies[i]
        addLog(`\n📧 Generating for ${i + 1}/${strategies.length}: ${exec.name}`)

        const response = await fetch('/api/generate-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            executive: { name: exec.name, title: exec.title },
            strategy: exec.strategies.primary,
            channel: 'email',
            bdProfile: profile,
          }),
        })

        const result = await response.json()
        addLog(`  ✅ Email generated`)

        setGeneratedMessages((prev) => [
          ...prev,
          {
            executiveId: exec.executiveId,
            executiveName: exec.name,
            email: exec.email,
            title: exec.title,
            emailMessage: result.messages?.original_message || 'Generated message',
            linkedinMessage: result.messages?.original_message || 'Generated message',
            smsMessage: result.messages?.original_message || 'Generated message',
          },
        ])
      }

      addLog(`\n✅ All messages generated!`)
      setMessage('✅ Ready to save!')
    } catch (error) {
      addLog(`\n❌ Error: ${String(error)}`)
      setMessage(`❌ Error generating messages`)
    } finally {
      setLoading(false)
    }
  }

  const saveToDatabase = async () => {
    setSavingToDB(true)
    addLog(`\n💾 Saving campaign draft to database...\n`)

    try {
      // Save campaign draft with executive IDs
      const { data, error } = await supabase
        .from('campaign_drafts')
        .insert([{
          campaign_name: campaignName,
          purpose: outreachPurpose,
          channel: 'email',
          status: 'draft',
          selected_executive_ids: strategies.map((s) => s.executiveId),
          messages: generatedMessages,
        }])
        .select()

      if (error) {
        throw new Error(`Failed to save: ${error.message}`)
      }

      const draftId = data[0].id
      addLog(`✅ Campaign saved!`)
      addLog(`📍 Draft ID: ${draftId}`)
      addLog(`👥 Executives: ${strategies.length}`)
      addLog(`\n🔗 Opening OutreachCampaigns...\n`)
      setMessage('✅ Campaign saved! Redirecting to OutreachCampaigns...')

      // Replace with your actual Vercel URL
      setTimeout(() => {
        window.location.href = `http://localhost:3002/campaigns/from-draft/${draftId}`
      }, 2000)
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setMessage(`❌ Failed to save campaign`)
    } finally {
      setSavingToDB(false)
    }
  }

  const downloadSpreadsheet = () => {
    try {
      addLog(`\n📥 Exporting to Excel...`)

      const data = generatedMessages.map((msg) => ({
        'Executive Name': msg.executiveName,
        'Title': msg.title,
        'Email': msg.email,
        'Email Message': msg.emailMessage,
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Messages')

      ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 60 }]

      XLSX.writeFile(wb, `${campaignName}.xlsx`)
      addLog(`✅ Downloaded!`)
    } catch (error) {
      addLog(`❌ Error: ${String(error)}`)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl shadow-lg p-12 text-white">
          <h1 className="text-6xl font-bold mb-4">📊 Bulk Outreach Campaign</h1>
          <p className="text-2xl">{strategies.length} executives selected from Outreach 1 MVP</p>
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
            <h2 className="text-4xl font-bold text-gray-900">Step 1: Campaign Details</h2>

            <div>
              <label className="block text-2xl font-bold text-gray-900 mb-4">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Healthcare Q3 Outreach"
                className="w-full px-6 py-4 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xl font-bold text-gray-900 mb-4">Campaign Purpose</label>
              <textarea
                value={outreachPurpose}
                onChange={(e) => setOutreachPurpose(e.target.value)}
                placeholder="E.g., Introduce new product, request partnership..."
                className="w-full px-6 py-4 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none h-32 resize-none"
              />
            </div>

            <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-6">
              <p className="text-lg font-bold text-blue-900">
                📋 {strategies.length} executives ready
              </p>
            </div>

            <button
              onClick={generateBulkMessages}
              disabled={loading || !outreachPurpose.trim() || !campaignName.trim()}
              className="w-full px-8 py-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-bold text-2xl"
            >
              {loading ? '⏳ Generating...' : '🚀 Generate Messages'}
            </button>
          </div>
        )}

        {step === 'generating' && (
          <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Generating...</h2>

            <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-6 mb-6">
              <p className="text-xl font-bold text-blue-900">
                {generatedMessages.length}/{strategies.length} generated
              </p>
            </div>

            <div className="bg-gray-900 text-white font-mono text-sm p-6 rounded-lg max-h-96 overflow-y-auto">
              {progressLog.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>

            {generatedMessages.length === strategies.length && (
              <button
                onClick={() => setStep('preview')}
                className="mt-6 w-full px-8 py-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-2xl"
              >
                ✅ Review & Save
              </button>
            )}
          </div>
        )}

        {step === 'preview' && generatedMessages.length > 0 && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Step 2: Review & Save</h2>

              <div className="mb-8 bg-green-50 border-4 border-green-300 rounded-lg p-6">
                <p className="text-xl font-bold text-green-900">
                  ✅ {generatedMessages.length} messages generated
                </p>
                <p className="text-sm text-green-700">
                  💾 Save to database for OutreachCampaigns to access and override targets
                </p>
              </div>

              <div className="overflow-x-auto mb-8">
                <table className="w-full border-4 border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="px-3 py-2 text-left font-bold">Executive</th>
                      <th className="px-3 py-2 text-left font-bold">Email</th>
                      <th className="px-3 py-2 text-left font-bold">Message Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedMessages.map((msg, idx) => (
                      <tr key={idx} className="border-t-4 border-gray-300">
                        <td className="px-3 py-2 font-bold text-gray-900">{msg.executiveName}</td>
                        <td className="px-3 py-2 text-gray-700 text-xs">{msg.email}</td>
                        <td className="px-3 py-2 text-gray-700 text-xs">
                          {msg.emailMessage.substring(0, 80)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <button
                  onClick={downloadSpreadsheet}
                  className="px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xl"
                >
                  📥 Download Excel
                </button>
                <button
                  onClick={saveToDatabase}
                  disabled={savingToDB}
                  className="px-8 py-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-xl"
                >
                  {savingToDB ? '⏳ Saving...' : '💾 Save to Database'}
                </button>
              </div>

              <div className="flex gap-6">
                <button
                  onClick={() => {
                    setStep('input')
                    setOutreachPurpose('')
                    setGeneratedMessages([])
                    setProgressLog([])
                  }}
                  className="flex-1 px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold"
                >
                  ← Start Over
                </button>
                <Link href="/strategies" className="flex-1">
                  <button className="w-full px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold">
                    🏠 Back
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
