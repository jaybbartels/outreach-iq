import { Anthropic } from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CONTEXT_TYPE_GUIDANCE: { [key: string]: string } = {
  selling: 'The sender is trying to sell/pitch something. Reference benefits and value propositions.',
  opinion: 'The sender wants the executive\'s feedback and perspective. Ask for their thoughts.',
  awareness: 'The sender is informing about important news or development. Present it professionally.',
}

export async function POST(request: Request) {
  try {
    const { executive, strategy, channel, bdProfile, isVariant, objective, messageContext } =
      await request.json()

    console.log('=== GENERATE MESSAGES REQUEST ===')
    console.log('Executive:', executive?.name)
    console.log('Channel:', channel)
    console.log('Strategy keys:', strategy ? Object.keys(strategy) : 'null')
    console.log('BDProfile:', bdProfile?.name)

    if (!executive || !strategy || !channel || !bdProfile) {
      console.log('❌ Missing required fields')
      console.log('  executive:', !!executive)
      console.log('  strategy:', !!strategy)
      console.log('  channel:', !!channel)
      console.log('  bdProfile:', !!bdProfile)
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(`📧 Generating ${isVariant ? 'variant' : ''} ${channel} messages for ${executive.name}`)

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

    const objectiveContext = isVariant
      ? `\n\nSPECIFIC OBJECTIVE FOR THIS VARIANT: ${objective}\nCreate a different version of the message with this specific angle/focus.`
      : ''

    const documentContext = messageContext && messageContext.contextType !== 'none'
      ? `\n\nDOCUMENT CONTEXT:\nType: ${messageContext.contextType}\nFilename: ${messageContext.documentName}\nContent: ${messageContext.documentContent}\n\nUse this document to customize your message. Reference specific points from it where relevant.`
      : ''

    let contextTypeGuidance = 'This is a general introductory outreach with no specific document context.'
    if (messageContext && messageContext.contextType !== 'none') {
      const contextType = messageContext.contextType as string
      contextTypeGuidance = CONTEXT_TYPE_GUIDANCE[contextType] || contextTypeGuidance
    }

    const guidelines = channelGuidelines[channel] || channelGuidelines.email

    // Get strategy - handle both old and new formats
    let strategyType = 'linkedin'
    let strategyDesc = 'Connect and build relationship'
    let strategyReason = 'Professional connection'

    if (strategy.primary) {
      strategyType = strategy.primary.type || 'linkedin'
      strategyDesc = strategy.primary.description || 'Connect and build relationship'
      strategyReason = strategy.primary.reasoning || 'Professional connection'
    } else if (strategy.type) {
      strategyType = strategy.type
      strategyDesc = strategy.description || 'Connect and build relationship'
      strategyReason = strategy.reasoning || 'Professional connection'
    }

    console.log(`Strategy: ${strategyType} - ${strategyDesc}`)

    const prompt = `Generate personalized outreach messages for this scenario.

EXECUTIVE: ${executive.name} (${executive.title})

SENDER PROFILE:
- Name: ${bdProfile.name}
- Title: ${bdProfile.title || 'Business Development'}
- Company: ${bdProfile.company_name}
- Expertise: ${(bdProfile.expertise_tags || []).join(', ')}
- Goals: ${bdProfile.goals || 'Strategic partnership'}

RECOMMENDED STRATEGY:
- Type: ${strategyType}
- Approach: ${strategyDesc}
- Why: ${strategyReason}

MESSAGE PURPOSE: ${contextTypeGuidance}
${documentContext}

CHANNEL: ${channel.toUpperCase()}
Guidelines: ${JSON.stringify(guidelines)}
${objectiveContext}

Generate a JSON object with these exact fields:
{
  "channel": "${channel}",
  "original_message": "The initial outreach message tailored to ${channel}",
  "follow_ups": {
    "no_response_3days": "Follow-up if no response after 3 days",
    "no_response_7days": "Follow-up if no response after 7 days",
    "soft_response": "Response if they engage positively but aren't ready",
    "interested": "If they show strong interest, next steps"
  },
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

IMPORTANT:
- Messages must match the channel guidelines for ${channel}
- Original message should reference the recommended strategy
- ${documentContext ? 'Reference the document content naturally in the message' : 'Messages should be professional and personalized'}
- Follow-ups should be increasingly specific/urgent
- Make it personal to ${executive.name}'s role
- Return ONLY valid JSON, no markdown or extra text`

    console.log('⏳ Calling Claude API...')
    
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    console.log('✅ Claude responded')

    let responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    console.log('Parsing JSON...')
    let generatedMessages = JSON.parse(responseText)
    console.log('✅ JSON parsed successfully')

    if (!isVariant) {
      console.log('Saving to database...')
      const { data: existingMessage, error: existingError } = await supabase
        .from('messages')
        .select('id')
        .eq('executive_name', executive.name)
        .eq('channel', channel)
        .single()

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError
      }

      if (existingMessage) {
        console.log('Updating existing message...')
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            original_message: generatedMessages.original_message,
            follow_ups: generatedMessages.follow_ups,
            tips: generatedMessages.tips,
            strategy_type: strategyType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMessage.id)

        if (updateError) throw updateError
      } else {
        console.log('Creating new message...')
        const { error: insertError } = await supabase.from('messages').insert({
          executive_id: executive.id || '',
          executive_name: executive.name,
          channel,
          strategy_type: strategyType,
          original_message: generatedMessages.original_message,
          follow_ups: generatedMessages.follow_ups,
          tips: generatedMessages.tips,
        })

        if (insertError) throw insertError
      }
    }

    console.log(`✅ Saved ${channel} messages`)

    return Response.json({
      success: true,
      channel,
      isVariant,
      messages: generatedMessages,
    })
  } catch (error) {
    console.error(
      '❌ Error:',
      error instanceof Error ? error.message : String(error)
    )
    console.error('Stack:', error instanceof Error ? error.stack : '')
    return Response.json(
      {
        error: 'Failed to generate messages',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
