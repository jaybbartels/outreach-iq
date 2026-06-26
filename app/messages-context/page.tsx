'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ContextType = 'selling' | 'opinion' | 'awareness' | 'none'

export default function MessagesContextPage() {
  const [contextType, setContextType] = useState<ContextType>('none')
  const [contextText, setContextText] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [documentContent, setDocumentContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageData, setMessageData] = useState<any>(null)

  useEffect(() => {
    const data = localStorage.getItem('messageData')
    if (data) {
      setMessageData(JSON.parse(data))
    }
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage('📄 Reading document...')

    try {
      const text = await file.text()
      setDocumentName(file.name)
      setDocumentContent(text)
      setMessage('✅ Document loaded successfully')
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage('❌ Error reading file: ' + String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (contextType !== 'none' && !contextText.trim() && !documentContent) {
      setMessage('❌ Please enter context or upload a document')
      return
    }

    // Combine text and document content
    const combinedContent = [contextText, documentContent].filter(Boolean).join('\n\n---\n\n')

    // Save context to localStorage
    localStorage.setItem(
      'messageContext',
      JSON.stringify({
        contextType,
        documentName: documentName || (contextText ? 'Text Input' : ''),
        documentContent: contextType !== 'none' ? combinedContent : '',
      })
    )

    window.location.href = '/messages'
  }

  const getContextDescription = (type: ContextType) => {
    switch (type) {
      case 'selling':
        return '💼 I am selling something to this executive'
      case 'opinion':
        return '💭 I want the executive\'s opinion or feedback'
      case 'awareness':
        return '📢 I want to make them aware of something'
      case 'none':
        return '📝 General introductory email (no context)'
      default:
        return ''
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
          <h1 className="text-5xl font-bold mb-3">📋 Message Context</h1>
          <p className="text-xl">
            Add context to your messages for more relevant outreach
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

        {/* Executive Info */}
        {messageData && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase mb-2">Executive</p>
                <h2 className="text-3xl font-bold text-gray-900">{messageData.executive.name}</h2>
                <p className="text-xl text-gray-700 mt-1">{messageData.executive.title}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600 uppercase mb-2">Sending From</p>
                <h3 className="text-3xl font-bold text-gray-900">{messageData.profile.name}</h3>
                <p className="text-xl text-gray-700 mt-1">{messageData.profile.title || 'Business Development'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Context Type Selection */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">What's the purpose of this outreach?</h3>
          <div className="space-y-4">
            {(['selling', 'opinion', 'awareness', 'none'] as ContextType[]).map((type) => (
              <label
                key={type}
                className={`flex items-start gap-4 p-5 rounded-lg border-4 cursor-pointer transition ${
                  contextType === type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-blue-400'
                }`}
              >
                <input
                  type="radio"
                  name="contextType"
                  value={type}
                  checked={contextType === type}
                  onChange={(e) => setContextType(e.target.value as ContextType)}
                  className="w-6 h-6 mt-1 accent-blue-600"
                />
                <div>
                  <p className="text-xl font-bold text-gray-900">{getContextDescription(type)}</p>
                  {type === 'selling' && (
                    <p className="text-gray-700 mt-1">Type or upload details about your product/service</p>
                  )}
                  {type === 'opinion' && (
                    <p className="text-gray-700 mt-1">Type or upload what you want feedback on</p>
                  )}
                  {type === 'awareness' && (
                    <p className="text-gray-700 mt-1">Type or upload the news/event you want to share</p>
                  )}
                  {type === 'none' && (
                    <p className="text-gray-700 mt-1">Start with a general introduction without context</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Context Input Section */}
        {contextType !== 'none' && (
          <>
            {/* Text Input */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Enter Context (Optional)</h3>
              <p className="text-lg text-gray-700 mb-6">
                {contextType === 'selling' && 'Describe what you\'re selling or proposing'}
                {contextType === 'opinion' && 'Paste or describe the topic you want feedback on'}
                {contextType === 'awareness' && 'Describe the news, update, or development'}
              </p>

              <textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder={
                  contextType === 'selling'
                    ? 'E.g., We offer AI-powered supply chain optimization software that reduces logistics costs by 20-30%...'
                    : contextType === 'opinion'
                    ? 'E.g., We\'re developing a new approach to healthcare automation and would value your perspective...'
                    : 'E.g., We just launched our new product line and thought you might be interested...'
                }
                className="w-full px-4 py-4 text-lg text-gray-900 border-4 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none h-32 resize-none"
              />

              <div className="mt-3 text-sm text-gray-600">
                {contextText.length} characters
                {contextText.length > 0 && contextText.length < 50 && ' - 💡 Add more detail for better messages'}
                {contextText.length >= 50 && ' - ✓ Good amount of context'}
              </div>
            </div>

            {/* Document Upload */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Upload Document (Optional)</h3>
              <p className="text-lg text-gray-700 mb-6">
                {contextType === 'selling' && 'Upload a product brief, proposal, or pitch deck'}
                {contextType === 'opinion' && 'Upload an article, report, or document'}
                {contextType === 'awareness' && 'Upload a news article, press release, or document'}
              </p>

              <div className="border-4 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                  id="fileInput"
                />
                <label htmlFor="fileInput" className="cursor-pointer">
                  <div className="text-5xl mb-3">📄</div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    {documentName ? documentName : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-gray-700">TXT, PDF, DOC, or DOCX (Max 10MB)</p>
                </label>
              </div>

              {documentContent && (
                <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-300 mt-6">
                  <p className="text-sm font-bold text-gray-600 uppercase mb-3">Document Preview</p>
                  <div className="max-h-32 overflow-y-auto text-gray-900 text-sm whitespace-pre-wrap">
                    {documentContent.substring(0, 300)}
                    {documentContent.length > 300 && '...'}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Summary */}
        <div className="bg-blue-50 border-4 border-blue-300 rounded-xl p-6">
          <p className="text-lg font-bold text-blue-900">
            {contextType === 'none' && '📝 You\'ll send a general introductory message'}
            {contextType === 'selling' && '💼 Messages will be customized to sell your offering'}
            {contextType === 'opinion' && '💭 Messages will request their opinion'}
            {contextType === 'awareness' && '📢 Messages will inform them about this'}
          </p>
          {(contextText || documentContent) && contextType !== 'none' && (
            <div className="text-blue-800 mt-3 space-y-1">
              {contextText && <p>✅ Text context will be used</p>}
              {documentContent && <p>✅ Document "{documentName}" will be used</p>}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleContinue}
            disabled={loading || (contextType !== 'none' && !contextText.trim() && !documentContent)}
            className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-bold text-lg"
          >
            ➜ Continue to Messages
          </button>
          <Link href="/strategies" className="flex-1">
            <button className="w-full px-6 py-4 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-bold text-lg">
              ← Back
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
