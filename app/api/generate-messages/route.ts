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

async function generateMessage(
  executive: any,
  strategy: any,
  channel: string,
  bdProfile: any,
  messageContext: any,
  strategyType: string,
  strategyDesc: string,
  strategyReason: string,
  guidelines: any,
  contextTypeGuidance: string,
  documentContext: string
) {
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
- Make it personal to ${executive.name}'s role
- Return ONLY valid JSON, no markdown or extra text`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  let responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(responseText)
}

export async function POST(request: Request) {
  try {
    const { executive, strategy, channel, bdProfile, isVariant, objective, messageContext } =
      await request.json()

    console.log(`📧 Generating ${channel} for ${executive.name}`)

    if (!executive || !strategy || !channel || !bdProfile) {
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
    if (messageContext && messageContext.contextType !== 'none') {
      const contextType = messageContext.contextType as string
      contextTypeGuidance = CONTEXT_TYPE_GUIDANCE[contextType] || contextTypeGuidance
    }

    const documentContext = messageContext && messageContext.contextType !== 'none'
      ? `\n\nDOCUMENT CONTEXT:\nType: ${messageContext.contextType}\nFilename: ${messageContext.documentName}\nContent: ${messageContext.documentContent}\n\nUse this document to customize your message.`
      : ''

    const guidelines = channelGuidelines[channel] || channelGuidelines.email

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

    console.log('⏳ Calling Claude API...')
    const generatedMessages = await generateMessage(
      executive,
      strategy,
      channel,
      bdProfile,
      messageContext,
      strategyType,
      strategyDesc,
      strategyReason,
      guidelines,
      contextTypeGuidance,
      documentContext
    )

    console.log('✅ Claude generated messages, saving to DB...')

    if (!isVariant) {
      console.log(`Checking for existing message for ${executive.name} on ${channel}...`)
      
      try {
        const { data: existingMessage, error: queryError } = await supabase
          .from('messages')
          .select('id')
          .eq('executive_name', executive.name)
          .eq('channel', channel)
          .single()

        if (queryError && queryError.code !== 'PGRST116') {
          console.error('Query error:', queryError)
          throw queryError
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

          if (updateError) {
            console.error('Update error:', updateError)
            throw updateError
          }
        } else {
          console.log('Creating new message...')
          console.log('Data to insert:', {
            executive_id: executive.id || null,
            executive_name: executive.name,
            channel,
            strategy_type: strategyType,
            original_message: generatedMessages.original_message,
            follow_ups: generatedMessages.follow_ups,
            tips: generatedMessages.tips,
          })

          const { error: insertError, data: insertData } = await supabase
            .from('messages')
            .insert({
              executive_id: executive.id || null,
              executive_name: executive.name,
              channel,
              strategy_type: strategyType,
              original_message: generatedMessages.original_message,
              follow_ups: generatedMessages.follow_ups,
              tips: generatedMessages.tips,
            })
            .select()

          if (insertError) {
            console.error('Insert error:', insertError)
            console.error('Insert error code:', insertError.code)
            console.error('Insert error message:', insertError.message)
            console.error('Insert error details:', insertError.details)
            throw insertError
          }

          console.log('Insert successful:', insertData)
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        throw dbError
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
    console.error('❌ Error:', error)
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Error details:', errorMsg)
    return Response.json(
      {
        error: 'Failed to generate messages',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}
