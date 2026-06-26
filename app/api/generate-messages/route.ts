import { Anthropic } from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { executive, strategy, channel, bdProfile, isVariant, objective, messageContext } =
      await request.json()

    if (!executive || !strategy || !channel || !bdProfile) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(
      `📧 Generating ${isVariant ? 'variant' : ''} ${channel} messages for ${executive.name}`
    )

    const channelGuidelines = {
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

    const contextTypeGuidance = messageContext && messageContext.contextType !== 'none'
      ? {
          selling: 'The sender is trying to sell/pitch something. Reference benefits and value propositions.',
          opinion: 'The sender wants the executive\'s feedback and perspective. Ask for their thoughts.',
          awareness: 'The sender is informing about important news or development. Present it professionally.',
        }[messageContext.contextType] || ''
      : 'This is a general introductory outreach with no specific document context.'

    const prompt = `Generate personalized outreach messages for this scenario.

EXECUTIVE: ${executive.name} (${executive.title})

SENDER PROFILE:
- Name: ${bdProfile.name}
- Title: ${bdProfile.title || 'Business Development'}
- Company: ${bdProfile.company_name}
- Expertise: ${(bdProfile.expertise_tags || []).join(', ')}
- Goals: ${bdProfile.goals || 'Strategic partnership'}

RECOMMENDED STRATEGY:
- Type: ${strategy.primary.type}
- Approach: ${strategy.primary.description}
- Why: ${strategy.primary.reasoning}

MESSAGE PURPOSE: ${contextTypeGuidance}
${documentContext}

CHANNEL: ${channel.toUpperCase()}
Guidelines: ${JSON.stringify(channelGuidelines[channel as keyof typeof channelGuidelines])}
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

    let responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let generatedMessages = JSON.parse(responseText)

    console.log('✅ Claude generated messages, saving to DB...')

    if (!isVariant) {
      const { data: existingMessage, error: existingError } = await supabase
        .from('messages')
        .select('id')
        .eq('executive_id', executive.id)
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
            strategy_type: strategy.primary.type,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMessage.id)

        if (updateError) throw updateError
      } else {
        console.log('Creating new message...')
        const { error: insertError } = await supabase.from('messages').insert({
          executive_id: executive.id,
          channel,
          strategy_type: strategy.primary.type,
          original_message: generatedMessages.original_message,
          follow_ups: generatedMessages.follow_ups,
          tips: generatedMessages.tips,
        })

        if (insertError) throw insertError
      }
    } else {
      console.log('Creating variant...')
      const { data: mainMessage, error: mainError } = await supabase
        .from('messages')
        .select('id')
        .eq('executive_id', executive.id)
        .eq('channel', channel)
        .single()

      if (mainError && mainError.code !== 'PGRST116') {
        throw mainError
      }

      if (mainMessage) {
        const { data: variants, error: variantError } = await supabase
          .from('message_variants')
          .select('variant_number')
          .eq('message_id', mainMessage.id)
          .order('variant_number', { ascending: false })
          .limit(1)

        if (variantError && variantError.code !== 'PGRST116') {
          throw variantError
        }

        const nextVariantNumber = variants && variants.length > 0 ? variants[0].variant_number + 1 : 1

        const { error: insertVarError } = await supabase.from('message_variants').insert({
          message_id: mainMessage.id,
          variant_number: nextVariantNumber,
          objective,
          original_message: generatedMessages.original_message,
          follow_ups: generatedMessages.follow_ups,
          tips: generatedMessages.tips,
        })

        if (insertVarError) throw insertVarError
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
    return Response.json(
      {
        error: 'Failed to generate messages',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
