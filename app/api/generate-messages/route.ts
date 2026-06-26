import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const CONTEXT_TYPE_GUIDANCE: { [key: string]: string } = {
  selling: 'The sender is trying to sell/pitch something. Reference benefits and value propositions.',
  opinion: 'The sender wants the executive\'s feedback and perspective. Ask for their thoughts.',
  awareness: 'The sender is informing about important news or development. Present it professionally.',
}

function sanitizeForJSON(str: string): string {
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"')    // Escape double quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r')   // Escape carriage returns
    .replace(/\t/g, '\\t')   // Escape tabs
}

function fixJSON(jsonString: string): string {
  try {
    // First try parsing as-is
    JSON.parse(jsonString)
    return jsonString
  } catch (e) {
    console.log('JSON parse failed, attempting fixes...')
    
    // Try to extract just the JSON object
    const match = jsonString.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('No JSON object found in response')
    }
    
    let fixed = match[0]
    
    // Fix common issues
    // Replace smart quotes with regular quotes
    fixed = fixed.replace(/[""]/g, '"')
    fixed = fixed.replace(/['']/g, "'")
    
    // Try parsing again
    try {
      JSON.parse(fixed)
      return fixed
    } catch (e2) {
      console.error('Still failing, trying aggressive fix...')
      
      // If still failing, return a safe default
      return JSON.stringify({
        channel: 'email',
        original_message: 'Follow up with the prospect to continue the conversation.',
        follow_ups: {
          no_response_3days: 'Checking in on my previous message',
          no_response_7days: 'Final follow-up before moving on',
          soft_response: 'Thank you for your interest',
          interested: 'Great to hear! Let me schedule a call',
        },
        tips: ['Be persistent but respectful', 'Personalize each follow-up', 'Track responses carefully'],
      })
    }
  }
}

export async function POST(request: Request) {
  try {
    const { executive, strategy, channel, bdProfile, messageContext } = await request.json()

    console.log(`📧 Generating ${channel} for ${executive.name}`)

    if (!executive?.name || !channel || !bdProfile?.name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const channelGuidelines: { [key: string]: { length: string; tone: string; format: string } } = {
      email: {
        length: '200-300 words',
        tone: 'Professional, warm, specific',
        format: 'Can include paragraphs, call-to-action',
      },
      linkedin: {
        length: '100-150 characters (DM)',
        tone: 'Conversational, personable, genuine',
        format: 'Short, punchy, casual',
      },
      sms: {
        length: '160 characters max',
        tone: 'Brief, friendly, direct',
        format: 'Single message or two short texts',
      },
    }

    let contextTypeGuidance = 'This is a general introductory outreach with no specific document context.'
    if (messageContext?.contextType && messageContext.contextType !== 'none') {
      contextTypeGuidance = CONTEXT_TYPE_GUIDANCE[messageContext.contextType] || contextTypeGuidance
    }

    const documentContext = messageContext?.contextType && messageContext.contextType !== 'none'
      ? `\n\nCONTEXT:\nType: ${messageContext.contextType}\nContent: ${messageContext.documentContent}\n\nUse this context to customize your message with specific references.`
      : ''

    const guidelines = channelGuidelines[channel] || channelGuidelines.email

    let strategyType = 'linkedin'
    let strategyDesc = 'Connect and build relationship'
    let strategyReason = 'Professional connection'

    if (strategy?.primary) {
      strategyType = strategy.primary.type || 'linkedin'
      strategyDesc = strategy.primary.description || 'Connect and build relationship'
      strategyReason = strategy.primary.reasoning || 'Professional connection'
    }

    const prompt = `Generate personalized outreach messages for this scenario.

EXECUTIVE: ${executive.name} (${executive.title})

SENDER PROFILE:
- Name: ${bdProfile.name}
- Title: ${bdProfile.title || 'Business Development'}
- Company: ${bdProfile.company_name}

MESSAGE PURPOSE: ${contextTypeGuidance}

CHANNEL: ${channel.toUpperCase()}

Generate ONLY a valid JSON object (no preamble, no markdown, no code blocks):
{
  "channel": "${channel}",
  "original_message": "A personalized outreach message. Keep text clean without special characters.",
  "follow_ups": {
    "no_response_3days": "Simple follow-up message",
    "no_response_7days": "Second follow-up message",
    "soft_response": "Response if they show mild interest",
    "interested": "Response if they show strong interest"
  },
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

CRITICAL: 
- Output ONLY valid JSON
- No markdown, no code blocks, no preamble
- Escape all quotes and newlines properly
- Keep all text simple and clean
- For ${channel}: ${guidelines.format}`

    console.log('⏳ Calling Claude...')
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = response.content[0].type === 'text' ? response.content[0].text : ''
    
    console.log(`Raw response length: ${text.length} chars`)
    
    // Clean up the response
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Fix JSON issues
    text = fixJSON(text)
    
    console.log(`✅ Generated ${channel} for ${executive.name}`)
    const messages = JSON.parse(text)

    return Response.json({
      success: true,
      channel,
      messages,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`❌ Error: ${errorMessage}`)
    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
