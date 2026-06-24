import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  try {
    const { bdProfile, executives } = await request.json()

    if (!bdProfile || !executives || executives.length === 0) {
      return Response.json(
        { error: 'Missing profile or executives' },
        { status: 400 }
      )
    }

    console.log('✅ Received profile:', bdProfile.name)
    console.log('✅ Received executives:', executives.length)

    // Build compact exec list
    const execList = executives
      .map((e: any) => `${e.name}|${e.title}|${e.email || 'unknown'}`)
      .join('\n')

    const prompt = `Generate connection strategies as ONLY a valid JSON array. No markdown, no explanation.

Schema (must be valid JSON):
{
  "executiveId": "string",
  "name": "string",
  "title": "string",
  "strategies": {
    "primary": {"type": "linkedin|conference|geographic|multi_step", "description": "string", "reasoning": "string", "successProbability": number, "effortLevel": "low|medium|high", "actionItems": ["string"]},
    "secondary": {"type": "string", "description": "string", "reasoning": "string", "successProbability": number, "effortLevel": "string", "actionItems": ["string"]},
    "tertiary": {"type": "string", "description": "string", "reasoning": "string", "successProbability": number, "effortLevel": "string", "actionItems": ["string"]}
  },
  "overallConnectionStrength": number,
  "bestTimeToReach": "string"
}

Generate strategies for these executives:
${execList}

BD Person: ${bdProfile.name}, ${bdProfile.title || 'BD'}, ${bdProfile.company_name || 'startup'}, expertise: ${(bdProfile.expertise_tags || []).join(', ') || 'general'}

Return ONLY valid JSON array with no trailing commas or syntax errors.`

    console.log('⏳ Calling Claude API with 6000 tokens...')

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 6000, // Increased from 4000
      messages: [{ role: 'user', content: prompt }],
    })

    console.log('✅ Claude response received')
    console.log('   Stop reason:', message.stop_reason)

    let responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    console.log('📝 Response length:', responseText.length)
    console.log('📝 Last 200 chars:', responseText.substring(responseText.length - 200))

    // Remove markdown code blocks
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    // Fix common JSON issues
    responseText = responseText
      .replace(/,\s*}/g, '}')  // Trailing commas before }
      .replace(/,\s*]/g, ']')  // Trailing commas before ]

    console.log('🧹 Cleaned, parsing...')

    let strategies = JSON.parse(responseText)

    console.log('✅ Success! Parsed', strategies.length, 'strategies')

    return Response.json({
      success: true,
      count: strategies.length,
      strategies,
    })
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error))
    
    return Response.json(
      {
        error: 'Failed to generate strategies',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
