// Collections & Companies
export interface Collection {
  id: string
  name: string
  slug: string
  icon: string
  description?: string
  created_at: Date
  is_public: boolean
}

export interface Company {
  id: string
  name: string
  status: string
  hq_location?: string
  industry?: string
  hq_state?: string
  created_at: Date
}

export interface Executive {
  id: string
  name: string
  title: string
  company_id: string
  email?: string
  linkedin_url?: string
  phone?: string
  confidence_level?: 'high' | 'medium' | 'low'
  research_status?: string
  created_at: Date
}

// OutreachIQ
export interface BDProfile {
  id: string
  user_id: string
  email: string
  name: string
  title?: string
  company_name?: string
  linkedin_url?: string
  location_city?: string
  location_state?: string
  location_lat?: number
  location_lng?: number
  expertise_tags: string[]
  goals?: string
  created_at: Date
  updated_at: Date
}

export interface OutreachCampaign {
  id: string
  bd_person_id: string
  collection_id: string
  name: string
  description?: string
  status: 'active' | 'paused' | 'completed'
  target_companies: number
  contacts_made: number
  created_at: Date
  updated_at: Date
}

export interface ConnectionStrategy {
  id: string
  campaign_id: string
  company_id: string
  target_executive_id?: string
  strategy_type: 'linkedin' | 'conference' | 'geographic' | 'multi_step'
  success_probability: number
  connection_strength: number
  effort_level: 'low' | 'medium' | 'high'
  recommended_timeline?: string
  action_items: string[]
  reasoning: string
  primary_strategy: string
  secondary_strategy?: string
  tertiary_strategy?: string
  status: 'pending' | 'in_progress' | 'attempted' | 'successful' | 'failed'
  created_at: Date
}
