export interface Executive {
  id: string
  created_at?: string
  updated_at?: string
  company_id?: string
  company_name?: string
  name: string
  title: string
  email?: string
  phone?: string
  linkedin_url?: string
  linkedin_engagement_score?: number
  email_engagement_score?: number
  social_media_engagement_score?: number
  event_visibility_score?: number
  response_history_score?: number
  overall_accessibility?: string
  research_status?: string
  research_completed_date?: string
  notes?: string
  confidence_level?: string
  data_sources?: any
}

export interface Collection {
  id: string
  user_id: string
  name: string
  description?: string
  icon?: string
  created_at?: string
  updated_at?: string
}

export interface BDProfile {
  id?: string
  user_id: string
  name: string
  title?: string
  company_name: string
  email?: string
  phone?: string
  linkedin_url?: string
  expertise_tags?: string[]
  goals?: string
  created_at?: string
  updated_at?: string
}
