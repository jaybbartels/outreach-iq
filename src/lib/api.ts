// API Client for outreach-api
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://outreach-api-lovat.vercel.app'

export const api = {
  // Discovery APIs
  async getCollections(userId?: string) {
    const params = userId ? `?user_id=${userId}` : ''
    const res = await fetch(`${API_URL}/api/v1/discover/collections${params}`)
    if (!res.ok) throw new Error('Failed to fetch collections')
    return res.json()
  },

  async getExecutives(collectionId?: string, limit = 50, offset = 0) {
    const params = new URLSearchParams()
    if (collectionId) params.append('collection_id', collectionId)
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())
    const res = await fetch(`${API_URL}/api/v1/discover/executives?${params}`)
    if (!res.ok) throw new Error('Failed to fetch executives')
    return res.json()
  },

  async getCollectionHealth(collectionId: string) {
    const res = await fetch(`${API_URL}/api/v1/discover/health/${collectionId}`)
    if (!res.ok) throw new Error('Failed to fetch collection health')
    return res.json()
  },

  // Strategy APIs
  async getProfiles(userId?: string) {
    const params = userId ? `?user_id=${userId}` : ''
    const res = await fetch(`${API_URL}/api/v1/strategy/profiles${params}`)
    if (!res.ok) throw new Error('Failed to fetch profiles')
    return res.json()
  },

  async getSequences(isTemplate = false) {
    const params = `?is_template=${isTemplate}`
    const res = await fetch(`${API_URL}/api/v1/strategy/sequences${params}`)
    if (!res.ok) throw new Error('Failed to fetch sequences')
    return res.json()
  },

  async getTemplates(channel?: string) {
    const params = channel ? `?channel=${channel}` : ''
    const res = await fetch(`${API_URL}/api/v1/strategy/templates${params}`)
    if (!res.ok) throw new Error('Failed to fetch templates')
    return res.json()
  },

  // Execution APIs
  async getCampaigns(status?: string) {
    const params = status ? `?status=${status}` : ''
    const res = await fetch(`${API_URL}/api/v1/execute/campaigns${params}`)
    if (!res.ok) throw new Error('Failed to fetch campaigns')
    return res.json()
  },

  async getCampaignDetail(campaignId: string) {
    const res = await fetch(`${API_URL}/api/v1/execute/campaigns/${campaignId}`)
    if (!res.ok) throw new Error('Failed to fetch campaign')
    return res.json()
  },

  async sendMessage(campaignId: string, executiveId: string, channel: string, message: string) {
    const res = await fetch(`${API_URL}/api/v1/execute/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: campaignId, executive_id: executiveId, channel, message_content: message })
    })
    if (!res.ok) throw new Error('Failed to send message')
    return res.json()
  },

  async getResponses(campaignId?: string) {
    const params = campaignId ? `?campaign_id=${campaignId}` : ''
    const res = await fetch(`${API_URL}/api/v1/execute/responses${params}`)
    if (!res.ok) throw new Error('Failed to fetch responses')
    return res.json()
  },

  // Analytics APIs
  async getCampaignStats(campaignId: string) {
    const res = await fetch(`${API_URL}/api/v1/analytics/campaigns?campaign_id=${campaignId}`)
    if (!res.ok) throw new Error('Failed to fetch campaign stats')
    return res.json()
  },

  async getROI() {
    const res = await fetch(`${API_URL}/api/v1/analytics/roi`)
    if (!res.ok) throw new Error('Failed to fetch ROI data')
    return res.json()
  }
}
