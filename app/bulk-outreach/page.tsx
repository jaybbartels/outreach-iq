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
  const [progressLog, setProgressLog] = useState<string[]>([])

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

  const addLog = (text: string) => {
    setProgressLog((prev) => [...prev, text])
    console.log(text)
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
      setGeneratedMessages([])
      setProgressLog([])
      addLog(`📊 Starting bulk message generation for ${strategies.length} executives...`)

      const allMessages: BulkMessage[] = []

      for (let i = 0; i < strategies.length; i++) {
        const exec = strategies[i]
        addLog(`\n[${i + 1}/${strategies.length}] Processing ${exec.name}...`)

        try {
          // Generate email message
          addLog(`  📧 Generating email for ${exec.name}...`)
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

          if (!emailResponse.ok) {
            addLog(`  ❌ Email API error: ${emailResponse.status}`)
            throw new Error(`Email API error: ${emailResponse.status}`)
          }

          const emailData = await emailResponse.json()
          const emailMessage = emailData.messages?.original_message || ''
          addLog(
            `  ✅ Email generated: ${emailMessage.substring(0, 50).replace(/\n/g, ' ')}...`
          )

          // Generate LinkedIn message
          addLog(`  🔗 Generating LinkedIn for ${exec.name}...`)
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

          if (!linkedinResponse.ok) {
            addLog(`  ❌ LinkedIn API error: ${linkedinResponse.status}`)
            throw new Error(`LinkedIn API error: ${linkedinResponse.status}`)
          }

          const linkedinData = await linkedinResponse.json()
          const linkedinMessage = linkedinData.messages?.original_message || ''
          addLog(
            `  ✅ LinkedIn generated: ${linkedinMessage.substring(0, 50).replace(/\n/g, ' ')}...`
          )

          // Generate SMS message
          addLog(`  💬 Generating SMS for ${exec.name}...`)
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

          if (!smsResponse.ok) {
            addLog(`  ❌ SMS API error: ${smsResponse.status}`)
            throw new Error(`SMS API error: ${smsResponse.status}`)
          }

          const smsData = await smsResponse.json()
          const smsMessage = smsData.messages?.original_message || ''
          addLog(`  ✅ SMS generated: ${smsMessage.substring(0, 50).replace(/\n/g, ' ')}...`)

          // Create message object
          const msgObj: BulkMessage = {
            executiveName: exec.name,
            email: exec.email,
            title: exec.title,
            emailMessage,
            linkedinMessage,
            smsMessage,
          }

          // Verify message object
          addLog(
            `  ✅ Message object created: ${msgObj.executiveName} | Email: ${msgObj.email}`
          )

          allMessages.push(msgObj)
          setGeneratedMessages([...allMessages])
          addLog(`  ✅ Messages accumulated: ${allMessages.length}/${strategies.length}`)
        } catch (error) {
          addLog(`  ❌ Error for ${exec.name}: ${String(error)}`)
          const msgObj: BulkMessage = {
            executiveName: exec.name,
            email: exec.email,
            title: exec.title,
            emailMessage: `Error: ${String(error)}`,
            linkedinMessage: 'Error generating',
            smsMessage: 'Error generating',
          }
          allMessages.push(msgObj)
          setGeneratedMessages([...allMessages])
        }
      }

      addLog(`\n✅ Generation complete! Total: ${allMessages.length} executives`)
      setGeneratedMessages(allMessages)
      setStep('preview')
      setMessage('✅ Messages generated successfully!')
    } catch (error) {
      addLog(`❌ Critical error: ${String(error)}`)
      setMessage('❌ Error generating messages: ' + String(error))
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  const downloadSpreadsheet = () => {
    if (generatedMessages.length === 0) {
      setMessage('❌ No messages to export')
      return
    }

    try {
      addLog(`\n📥 Exporting ${generatedMessages.length} messages to Excel...`)

      const data = generatedMessages.map((msg) => ({
        'Executive Name': msg.executiveName,
        'Title': msg.title,
        'Email': msg.email,
        'Email Message': msg.emailMessage,
        'LinkedIn Message': msg.linkedinMessage,
        'SMS Message': msg.smsMessage,
      }))

      addLog(`  Creating workbook with ${data.length} rows...`)

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Outreach Messages')

      ws['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
        { wch: 60 },
        { wch: 60 },
        { wch: 40 },
      ]

      XLSX.writeFile(wb, 'bulk-outreach-messages.xlsx')
      addLog(`✅ Spreadsheet downloaded successfully!`)
      setMessage('✅ Spreadsheet downloaded successfully!')
    } catch (error) {
      addLog(`❌ Error downloading: ${String(error)}`)
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

        {step === 'generating' && (
          <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Generation in Progress...</h2>

            <div className="bg-blue-50 border-4 border-blue-300 rounded-lg p-6 mb-6">
              <p className="text-xl font-bold text-blue-900">
                Generated so far: {generatedMessages.length}/{strategies.length}
              </p>
            </div>

            {/* Progress Log */}
            <div className="bg-gray-900 text-white font-mono text-sm p-6 rounded-lg max-h-96 overflow-y-auto">
              {progressLog.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-words">
                  {log}
                </div>
              ))}
            </div>

            {generatedMessages.length === strategies.length && (
              <button
                onClick={() => setStep('preview')}
                className="mt-6 w-full px-8 py-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-2xl"
              >
                ✅ View Results
              </button>
            )}
          </div>
        )}

        {step === 'preview' && generatedMessages.length > 0 && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-12 border-4 border-gray-200">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Step 2: Review & Export</h2>

              <div className="mb-8 bg-green-50 border-4 border-green-300 rounded-lg p-6">
                <p className="text-xl font-bold text-green-900">
                  ✅ Generated {generatedMessages.length} message sets (Email + LinkedIn + SMS)
                </p>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full border-4 border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="px-3 py-2 text-left font-bold">Executive</th>
                      <th className="px-3 py-2 text-left font-bold">Email</th>
                      <th className="px-3 py-2 text-left font-bold">Email Message</th>
                      <th className="px-3 py-2 text-left font-bold">LinkedIn Message</th>
                      <th className="px-3 py-2 text-left font-bold">SMS Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedMessages.map((msg, idx) => (
                      <tr key={idx} className="border-t-4 border-gray-300">
                        <td className="px-3 py-2">
                          <p className="font-bold text-gray-900">{msg.executiveName}</p>
                          <p className="text-gray-700 text-xs">{msg.title}</p>
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">{msg.email || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 text-xs">
                          {msg.emailMessage.substring(0, 80)}...
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">
                          {msg.linkedinMessage.substring(0, 80)}...
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">
                          {msg.smsMessage.substring(0, 80)}...
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
                    setProgressLog([])
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
      </div>
    </div>
  )
}
