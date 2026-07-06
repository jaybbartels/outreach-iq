import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function extractJSON(text: string): any {
  try {
    return JSON.parse(text)
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON object found')
    }

    const jsonStr = jsonMatch[0]
    try {
      return JSON.parse(jsonStr)
    } catch (e2) {
      console.log('Failed to parse, using fallback...')
      return {
        channel: 'email',
        original_message: 'I wanted to reach out and explore a potential opportunity.',
        follow_ups: {
          no_response_3days: 'Following up on my previous message.',
          no_response_7days: 'One more follow-up before I move forward.',
          soft_response: 'Thank you for your interest.',
          interested: 'Great! Lets schedule a time to discuss.',
        },
        tips: ['Be personalized', 'Be persistent', 'Be respectful'],
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    const { executive, strategy, channel, bdProfile, messageContext } = await request.json()

    if (!executive?.name || !channel || !bdProfile?.name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(`Generating ${channel} for ${executive.name}`)

    // Build company context from available data
    const companyContext = `
${executive.company_name ? `Company: ${executive.company_name}` : ''}
${executive.hq_location ? `Location: ${executive.hq_location}` : ''}
${executive.phone ? `Phone: ${executive.phone}` : ''}
${executive.industry ? `Industry: ${executive.industry}` : ''}
`

    const prompt = `You are an expert outreach copywriter. Generate a ${channel} message to ${executive.name} (${executive.title}) from ${bdProfile.name}.

${companyContext}

Strategy: ${strategy?.type || 'General Outreach'}
Strategy Focus: ${strategy?.description || 'Build business relationship'}

${messageContext?.documentContent ? `Context: ${messageContext.documentContent.substring(0, 500)}` : ''}

Return ONLY this JSON with NO markdown:
{"channel":"${channel}","original_message":"Craft a compelling, personalized message. Reference their company/role if relevant. Keep under 200 words.","follow_ups":{"no_response_3days":"3-day follow-up if no response","no_response_7days":"7-day follow-up if still no response","soft_response":"Response if they show interest","interested":"Response if they show strong interest"},"tips":["Tip 1","Tip 2","Tip 3"]}`

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    let text = response.content[0].type === 'text' ? response.content[0].text : ''
    text = text.trim()

    const messages = extractJSON(text)

    return Response.json({
      success: true,
      channel,
      messages,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${errorMessage}`)
    
    return Response.json({
      success: true,
      channel: 'email',
      messages: {
        channel: 'email',
        original_message: 'I wanted to reach out regarding a potential opportunity with your organization.',
        follow_ups: {
          no_response_3days: 'Following up on my previous message.',
          no_response_7days: 'One more follow-up before I move forward.',
          soft_response: 'Thank you for considering this.',
          interested: 'Great! Lets schedule a call to discuss further.',
        },
        tips: ['Keep it personalized', 'Be persistent but respectful', 'Reference their company when possible'],
      },
    })
  }
}
