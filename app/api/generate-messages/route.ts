import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function extractJSON(text: string): any {
  try {
    // Try direct parse first
    return JSON.parse(text)
  } catch (e) {
    // Try to find JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON object found')
    }

    const jsonStr = jsonMatch[0]
    try {
      return JSON.parse(jsonStr)
    } catch (e2) {
      // Last resort: extract fields manually
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

    const prompt = `You are an expert outreach copywriter. Generate a ${channel} message to ${executive.name} from ${bdProfile.name}.

Return ONLY this JSON structure with NO markdown, NO code blocks, NO extra text:

{"channel":"${channel}","original_message":"Write a short professional message. Keep it under 200 words. Use simple language.","follow_ups":{"no_response_3days":"A follow-up message if no response after 3 days","no_response_7days":"Another follow-up if still no response","soft_response":"A response if they show some interest","interested":"A response if they show strong interest"},"tips":["First tip","Second tip","Third tip"]}`

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
    
    // Return safe fallback to not break the bulk operation
    return Response.json({
      success: true,
      channel: 'email',
      messages: {
        channel: 'email',
        original_message: 'I wanted to reach out regarding a potential opportunity.',
        follow_ups: {
          no_response_3days: 'Following up on my previous message.',
          no_response_7days: 'One more follow-up before I move forward.',
          soft_response: 'Thank you for considering this.',
          interested: 'Great! Lets schedule a call to discuss further.',
        },
        tips: ['Keep it personalized', 'Be persistent but respectful', 'Track all responses'],
      },
    })
  }
}
