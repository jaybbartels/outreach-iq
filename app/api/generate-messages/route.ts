import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const CONTEXT_TYPE_GUIDANCE: { [key: string]: string } = {
  selling: 'The sender is trying to sell/pitch something. Reference benefits and value propositions.',
  opinion: 'The sender wants the executive\'s feedback and perspective. Ask for their thoughts.',
  awareness: 'The sender is informing about important news or development. Present it professionally.',
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
- Expertise: ${(bdProfile.expertise_tags || []).join(', ') || 'Strategic partnerships'}
- Goals: ${bdProfile.goals || 'Build meaningful connections'}

RECOMMENDED STRATEGY:
- Type: ${strategyType}
- Approach: ${strategyDesc}
- Why: ${strategyReason}

MESSAGE PURPOSE: ${contextTypeGuidance}
${documentContext}

CHANNEL: ${channel.toUpperCase()}
Guidelines: ${JSON.stringify(guidelines)}

Generate a JSON object with these exact fields:
{
  "channel": "${channel}",
  "original_message": "A personalized outreach message that follows the channel guidelines and references the strategy",
  "follow_ups": {
    "no_response_3days": "Follow-up if no response after 3 days",
    "no_response_7days": "Follow-up if no response after 7 days",
    "soft_response": "Response if they engage positively but aren't ready",
    "interested": "If they show strong interest, next steps"
  },
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

IMPORTANT:
- Messages must match the channel guidelines
- Reference the strategy approach in the message
- Make it highly personalized to ${executive.name}'s role and context
- For email: write like the example below (rich, detailed, professional)
- For LinkedIn: write conversational, brief, casual
- For SMS: write very short, direct, punchy
- Return ONLY valid JSON, no markdown or preamble`

    console.log('⏳ Calling Claude...')
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = response.content[0].type === 'text' ? response.content[0].text : ''
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
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
