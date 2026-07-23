import { Body, Controller, Post } from '@nestjs/common';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ChatbotLanguage, ChatbotService } from './chatbot.service';

class ChatbotMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;

  @IsIn(['en', 'hi'])
  language: ChatbotLanguage;
}

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  message(@Body() body: ChatbotMessageDto) {
    return {
      reply: this.chatbotService.reply(body.message, body.language),
      supportSuggested: this.chatbotService.shouldSuggestSupport(body.message),
    };
  }
}
