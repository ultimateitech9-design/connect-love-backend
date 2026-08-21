import { Controller, Get, Post, Body, Param, Delete, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('batch-delete')
  async batchDelete(@Request() req, @Body('messageIds') messageIds: string[]) {
    await this.messagesService.removeMany(messageIds, req.user.userId);
    return { success: true };
  }

  @Get(':id/info')
  async messageInfo(@Request() req, @Param('id') id: string) {
    return this.messagesService.getInfo(id, req.user.userId);
  }

  @Get(':conversationId')
  async getConversationMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.messagesService.findAll(conversationId, req.user.userId, Number(limit) || 50, before);
  }

  @Post(':conversationId')
  async createMessage(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body('receiverId') receiverId: string,
    @Body('text') text: string,
    @Body('content') content: string,
    @Body('replyToMessageId') replyToMessageId?: string,
  ) {
    return this.messagesService.create(conversationId, req.user.userId, receiverId, content || text, replyToMessageId);
  }

  @Delete(':id')
  async deleteMessage(@Request() req, @Param('id') id: string, @Body('scope') scope?: 'me' | 'everyone') {
    return this.messagesService.remove(id, req.user.userId, scope || 'me');
  }

  @Post(':id/delete')
  async deleteMessageAction(@Request() req, @Param('id') id: string, @Body('scope') scope?: 'me' | 'everyone') {
    return this.messagesService.remove(id, req.user.userId, scope || 'me');
  }

  @Delete('conversation/:conversationId')
  async clearConversation(@Request() req, @Param('conversationId') conversationId: string) {
    await this.messagesService.clearConversation(conversationId, req.user.userId);
    return { success: true };
  }

  @Patch(':id')
  async editMessage(@Request() req, @Param('id') id: string, @Body('content') content: string) {
    return this.messagesService.update(id, req.user.userId, content);
  }

  @Patch(':id/pin')
  async togglePin(@Request() req, @Param('id') id: string) {
    return this.messagesService.togglePin(id, req.user.userId);
  }

  @Patch(':id/star')
  async toggleStar(@Request() req, @Param('id') id: string) {
    return this.messagesService.toggleStar(id, req.user.userId);
  }

  @Patch(':id/reaction')
  async toggleReaction(@Request() req, @Param('id') id: string, @Body('emoji') emoji: string) {
    return this.messagesService.toggleReaction(id, req.user.userId, emoji);
  }

  @Patch(':conversationId/read')
  async markAsRead(@Request() req, @Param('conversationId') conversationId: string) {
    await this.messagesService.markAsRead(conversationId, req.user.userId);
    return { success: true };
  }
}
