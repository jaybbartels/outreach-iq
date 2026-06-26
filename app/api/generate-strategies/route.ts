import { Anthropic } from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request) {
  try {
    const { bdProfile, executives } = await request.json()

    if (!bdProfile || !executives || executives.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(`🧠 Generating strategies for ${executives.length} executives...`)

    const executivesList = executives
      .map(
        (exec: any) =>
          `- ${exec.name} (${exec.title}) at ${exec.company_name || 'Unknown Company'}`
      )
      .join('\n')

    const prompt = `You are an expert business development strategist. Generate personalized connection strategies for these executives.

BD PROFILE:
- Name: ${bdProfile.name}
- Title: ${bdProfile.title || 'Business Development'}
- Company: ${bdProfile.company_name}
- Expertise: ${(bdProfile.expertise_tags || []).join(', ')}
- Goals: ${bdProfile.goals || 'Strategic partnership'}

EXECUTIVES TO REACH:
${executivesList}

For EACH executive, analyze:
1. Their role and likely challenges
2. How ${bdProfile.name}'s expertise/company can help them
3. The best way to approach them

Generate a JSON array with ONE object per executive. Each object must have:
{
  "executiveId": "database-uuid-from-input",
  "name": "Full Name",
  "title": "Job Title",
  "strategies": {
    "primary": {
      "type": "linkedin|conference|geographic|multi_step|personal_connection|content|referral",
      "description": "Clear description of approach",
      "reasoning": "Why this works for them",
      "successProbability": 75,
      "effortLevel": "low|medium|high",
      "actionItems": ["Step 1", "Step 2", "Step 3"]
    },
    "secondary": { ... same structure ... },
    "tertiary": { ... same structure ... }
  },
  "overallConnectionStrength": 85,
  "bestTimeToReach": "Tuesday 10am"
}

CRITICAL RULES:
- For each executive, use their provided "id" field as executiveId
- Probability and connection strength are 0-100 integers
- Return ONLY a valid JSON array, no markdown, no preamble
- Each object must include all fields shown above`

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 6000,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nEXECUTIVES DATA (use the id field from each):\n${JSON.stringify(executives, null, 2)}`,
        },
      ],
    })

    let responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Clean response
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let strategies = JSON.parse(responseText)

    // Ensure it's an array
    if (!Array.isArray(strategies)) {
      strategies = [strategies]
    }

    // Validate and map strategies to preserve executiveId properly
    strategies = strategies.map((strategy: any) => {
      // Find the matching executive from input to get correct UUID
      const originalExec = executives.find(
        (e: any) =>
          e.name === strategy.name || e.id === strategy.executiveId
      )

      return {
        executiveId: originalExec?.id || strategy.executiveId,
        name: strategy.name,
        title: strategy.title,
        strategies: strategy.strategies,
        overallConnectionStrength: strategy.overallConnectionStrength,
        bestTimeToReach: strategy.bestTimeToReach,
      }
    })

    console.log(`✅ Generated ${strategies.length} strategies`)

    return Response.json({ success: true, strategies })
  } catch (error) {
    console.error('Strategy generation error:', error)
    return Response.json(
      {
        error: 'Failed to generate strategies',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
