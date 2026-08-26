// src/shared/whatsapp/whatsapp.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as twilio from 'twilio'
import { UsersService } from '@/modules/users/users.service'
import { CreateUserDto } from '@/modules/users/dto/create-user.dto'

@Injectable()
export class WhatsAppService {
  private readonly client
  private readonly fromNumber: string
  private readonly logger = new Logger(WhatsAppService.name)
  private logoUrl: string
  private signInUrl: string
  // In-memory conversation state: { [phone]: { step: number, data: Partial<CreateUserDto> } }
  private registrationState: Record<
    string,
    { step: number; data: Partial<CreateUserDto> }
  > = {}

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService
  ) {
    const accountSid = this.configService.get('app.twilio.sid')
    const authToken = this.configService.get('app.twilio.token')
    this.fromNumber = this.configService.get('app.twilio.whatsappNumber')
    this.logoUrl = this.configService.get('app.logoUrl')
    this.signInUrl = this.configService.get('app.url.signIn')
    this.client = twilio(accountSid, authToken)
  }

  private async sendMessage(from: string, to: string, body: string) {
    await this.client.messages.create({ body, from, to })
  }

  private async sendMediaMessage(
    from: string,
    to: string,
    body: string,
    mediaUrl: string
  ) {
    console.log({ body, from, to, mediaUrl })
    await this.client.messages.create({
      body,
      from: this.fromNumber,
      to,
      mediaUrl: [mediaUrl]
    })
  }

  /**
   * Handles incoming WhatsApp messages and manages interactive user registration.
   * @param message Incoming message text
   * @param from WhatsApp phone number (from Twilio)
   */
  public async handleMessage(
    from: string,
    to: string,
    message: string
  ): Promise<string> {
    try {
      const cleanMessage = message.trim()
      const lowerMessage = cleanMessage.toLowerCase()

      // If user is in registration flow, continue registration
      if (this.registrationState[from]) {
        // Allow cancel registration with "cancelar"
        if (cleanMessage.toLowerCase() === 'cancelar') {
          delete this.registrationState[from]
          await this.sendMessage(
            from,
            to,
            '🚫 Registration cancelled. You can start again whenever you want.'
          )
          return 'Registration cancelled'
        }
        return await this.handleRegistrationStep(from, to, cleanMessage)
      }

      // Command handlers
      const commandHandlers: Record<string, () => Promise<void>> = {
        menu: async () =>
          this.sendMessage(
            from,
            to,
            '📋 *Menu*\n1️⃣ Register a user\n2️⃣ View users\n\nSend the number of the desired option. 😊'
          ),
        hello: async () =>
          this.sendMediaMessage(
            from,
            to,
            '👋 Hello! My name is Timi, how can I assist you today? for more options type menu',
            this.logoUrl
          ),
        hola: async () =>
          this.sendMediaMessage(
            from,
            to,
            '👋 Hello! My name is Timi, how can I assist you today? for more options type menu',
            this.logoUrl
          ),
        bye: async () =>
          this.sendMessage(from, to, '👋 Goodbye! Have a great day! wouff'),
        help: async () => commandHandlers.menu(),
        '1': async () => {
          // Do not allow starting if registration is already in progress
          if (this.registrationState[to]) {
            await this.sendMessage(
              from,
              to,
              'You already have a registration in progress. Answer the questions or type "cancelar" to abort.'
            )
            return
          }
          this.registrationState[to] = { step: 0, data: { phone: to } }
          await this.sendMessage(
            from,
            to,
            '📝 *User Registration*\nWhat is your first name?\n(Type "cancelar" at any time to abort)'
          )
        },
        '2': async () =>
          this.sendMessage(
            from,
            to,
            '🚫 No users listed yet. Try registering one! 📝'
          )
      }

      if (commandHandlers[lowerMessage]) {
        await commandHandlers[lowerMessage]()
        return 'Message processed'
      }

      await this.sendMessage(
        from,
        to,
        '❓ *Invalid option.* Type *"menu"* to see available options. 🚀'
      )
      return 'Message processed'
    } catch (error) {
      this.logger.error('Error processing message', error)
      // Send error log via WhatsApp to user
      await this.sendMessage(
        from,
        to,
        `❌ Error processing message: ${error?.message || error}`
      )
      throw new Error(`❌ Error processing message: ${error}`)
    }
  }

  /**
   * Handles each step of the interactive registration process.
   */
  private async handleRegistrationStep(
    from: string,
    to: string,
    message: string
  ): Promise<string> {
    const state = this.registrationState[to]
    const data = state.data
    const steps = [
      {
        key: 'name',
        prompt: 'What is your first name? (minimum 2 characters)'
      },
      {
        key: 'lastName',
        prompt: 'What is your last name? (minimum 2 characters)'
      },
      {
        key: 'phone',
        prompt: 'What is your phone number? (minimum 10 digits)'
      },
      { key: 'email', prompt: 'What is your email address?' },
      { key: 'password', prompt: 'Create a password (minimum 8 characters):' }
    ]
    // Validate and save previous answer based on requested field
    if (state.step > 0) {
      const prevKey = steps[state.step - 1].key
      try {
        if (prevKey === 'name') {
          if (typeof data[prevKey] === 'undefined') {
            if (message.length < 2) {
              await this.sendMessage(
                from,
                to,
                'Name must be at least 2 characters.'
              )
              return 'Waiting for valid name'
            }
            data[prevKey] = message
          }
        } else if (prevKey === 'lastName') {
          if (typeof data[prevKey] === 'undefined') {
            if (message.length < 2) {
              await this.sendMessage(
                from,
                to,
                'Last name must be at least 2 characters.'
              )
              return 'Waiting for valid last name'
            }
            data[prevKey] = message
          }
        } else if (prevKey === 'phone') {
          if (typeof data[prevKey] === 'undefined') {
            const phoneClean = message.replace(/\D/g, '')
            if (phoneClean.length < 10) {
              await this.sendMessage(
                from,
                to,
                'Phone must be at least 10 digits.'
              )
              return 'Waiting for valid phone'
            }
            data[prevKey] = phoneClean
          }
        } else if (prevKey === 'email') {
          if (typeof data[prevKey] === 'undefined') {
            if (!/^\S+@\S+\.\S+$/.test(message)) {
              await this.sendMessage(
                from,
                to,
                'Please enter a valid email address.'
              )
              return 'Waiting for valid email'
            }
            const exists = await this.usersService.findByEmail(message)
            if (exists) {
              await this.sendMessage(
                from,
                to,
                'This email is already registered. Enter a different one.'
              )
              return 'Waiting for unique email'
            }
            data[prevKey] = message
          }
        } else if (prevKey === 'password') {
          if (typeof data[prevKey] === 'undefined') {
            if (message.length < 8) {
              await this.sendMessage(
                from,
                to,
                'Password must be at least 8 characters.'
              )
              return 'Waiting for valid password'
            }
            data[prevKey] = message
          }
        }
      } catch (err) {
        delete this.registrationState[from]
        await this.sendMessage(
          from,
          to,
          `❌ Error in registration, please try again. (${err?.message || err})`
        )
        return 'Registration error'
      }
    }

    // If finished all steps, create user
    if (state.step === steps.length) {
      const emailExist = await this.usersService.findByEmail(data.email)
      if (emailExist) {
        await this.sendMessage(
          from,
          to,
          'This email is already registered. Registration cancelled.'
        )
        delete this.registrationState[from]
        return 'Registration failed'
      }

      const phoneExist = await this.usersService.findByPhone(data.phone)
      if (phoneExist) {
        await this.sendMessage(
          from,
          to,
          'This phone number is already registered. Registration cancelled.'
        )
        delete this.registrationState[from]
        return 'Registration failed'
      }
      // Clean WhatsApp number to save only digits
      const phoneClean = from.replace(/\D/g, '')
      data.phone = phoneClean
      try {
        await this.usersService.create(data as CreateUserDto)
        await this.sendMessage(
          from,
          to,
          `✅ *Registration complete!* Welcome to Timi! 🎉\nGo and signup in our website for more information:\n${this.signInUrl}`
        )
      } catch (err) {
        await this.sendMessage(
          from,
          to,
          `❌ Registration failed: ${err.message}`
        )
      }
      delete this.registrationState[from]
      return 'Registration complete'
    }

    // Ask next question
    const nextPrompt = steps[state.step].prompt
    state.step++
    if (nextPrompt) {
      await this.sendMessage(from, to, nextPrompt)
      return 'Awaiting next answer'
    }
    // If last answer was password, attempt registration immediately
    if (steps[state.step - 1].key === 'password') {
      return await this.handleRegistrationStep(from, to, message)
    }
    return 'Awaiting next answer'
  }
}
