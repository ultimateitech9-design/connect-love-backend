import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':conversationId')
  async getConversationMessages(@Request() req, @Param('conversationId') conversationId: string) {
    return this.messagesService.findAll(conversationId, req.user.userId);
  }

  @Post(':conversationId')
  async createMessage(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body('receiverId') receiverId: string,
    @Body('text') text: string,
  ) {
    return this.messagesService.create(conversationId, req.user.userId, receiverId, text);
  }

  @Delete(':id')
  async deleteMessage(@Request() req, @Param('id') id: string) {
    return this.messagesService.remove(id, req.user.userId);
  }

  @Patch(':conversationId/read')
  async markAsRead(@Request() req, @Param('conversationId') conversationId: string) {
    await this.messagesService.markAsRead(conversationId, req.user.userId);
    return { success: true };
  }
}
