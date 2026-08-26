// src/shared/openai/openai.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as twilio from 'twilio'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat'
import { UsersService } from '@/modules/users/users.service'
import { CreateUserDto } from '@/modules/users/dto/create-user.dto'

@Injectable()
export class OpenAIService {
  private readonly client
  private readonly fromNumber: string
  private readonly logger = new Logger(OpenAIService.name)
  private readonly openai: OpenAI
  private logoUrl: string

  private conversations: Record<
    string,
    { history: ChatCompletionMessageParam[]; data: Partial<CreateUserDto> }
  > = {}

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    const accountSid = this.configService.get('app.twilio.sid')
    const authToken = this.configService.get('app.twilio.token')
    this.fromNumber = this.configService.get('app.twilio.whatsappNumber')
    this.logoUrl = this.configService.get('app.logoUrl')
    this.client = twilio(accountSid, authToken)

    this.openai = new OpenAI({
      apiKey: this.configService.get('openai.apiKey')
    })
  }

  private async sendMessage(to: string, body: string) {
    await this.client.messages.create({ body, from: this.fromNumber, to })
  }

  private systemPrompt = `
You are a helpful assistant that registers users step by step in a WhatsApp chat.
Collect the following info:
- First Name
- Last Name
- Email
- Age
- Country
- State
- Password

Only ask for one field at a time unless the user provides multiple.
Once everything is gathered, say: "✅ Registration complete!" and wait.
`

  public async handleMessage(message: string, from: string): Promise<string> {
    try {
      const cleanMessage = message.trim()

      if (!this.conversations[from]) {
        this.conversations[from] = {
          history: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: cleanMessage }
          ],
          data: {}
        }
      } else {
        this.conversations[from].history.push({
          role: 'user',
          content: cleanMessage
        })
      }

      const conversation = this.conversations[from]

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get('OPENAI_MODEL') || 'gpt-4',
        messages: conversation.history,
        temperature: 0.5
      })

      const assistantMessage = completion.choices[0].message.content || ''
      conversation.history.push({
        role: 'assistant',
        content: assistantMessage
      })

      const extracted = this.extractFields(cleanMessage)
      conversation.data = { ...conversation.data, ...extracted }

      if (this.isRegistrationComplete(conversation.data)) {
        const exists = await this.usersService.findByEmail(
          conversation.data.email!
        )
        if (exists) {
          await this.sendMessage(
            from,
            '❌ This email is already registered. Please try with another.'
          )
          delete this.conversations[from]
          return 'Duplicate email'
        }

        const phoneClean = from.replace(/\D/g, '')
        conversation.data.phone = phoneClean
        // Assign empty string to city, address and postalCode if not present
        if (!('city' in conversation.data)) conversation.data.city = ''
        if (!('address' in conversation.data)) conversation.data.address = ''
        if (!('postalCode' in conversation.data))
          conversation.data.postalCode = ''

        await this.usersService.create(conversation.data as CreateUserDto)

        await this.sendMessage(
          from,
          '✅ *Registration complete!* Welcome to Timi! 🎉'
        )
        delete this.conversations[from]
      } else {
        await this.sendMessage(from, assistantMessage)
      }

      return 'Processed with AI'
    } catch (error) {
      this.logger.error('OpenAI Error', error)
      await this.sendMessage(
        from,
        `❌ Error processing message: ${error.message || error}`
      )
      return 'Error'
    }
  }

  private extractFields(message: string): Partial<CreateUserDto> {
    const data: Partial<CreateUserDto> = {}

    const emailMatch = message.match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
    )
    if (emailMatch) data.email = emailMatch[0]

    const ageMatch = message.match(/\b(\d{1,3})\b/)
    if (ageMatch) {
      const age = parseInt(ageMatch[1])
      if (age > 0 && age < 120) data.age = age
    }

    const passwordMatch = message.match(/password[:\s]*([^\s]+)/i)
    if (passwordMatch) data.password = passwordMatch[1]

    // You can add detection for name, lastName, country, state here

    return data
  }

  private isRegistrationComplete(data: Partial<CreateUserDto>): boolean {
    return (
      !!data.name &&
      !!data.lastName &&
      !!data.email &&
      !!data.age &&
      !!data.country &&
      !!data.state &&
      !!data.password
    )
  }
}
