import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /users/me — returns the currently authenticated user's profile */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  /** PATCH /users/me — update the currently authenticated user's profile */
  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/coins/recharge')
  rechargeCoins(@Request() req: any, @Body('amount') amount: number) {
    return this.usersService.rechargeCoins(req.user.userId, amount);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/coins/spend')
  spendCoins(@Request() req: any, @Body('amount') amount: number) {
    return this.usersService.spendCoins(req.user.userId, amount);
  }

  /** GET /users/me/export - returns a portable copy of the authenticated user's data */
  @UseGuards(AuthGuard('jwt'))
  @Get('me/export')
  exportMe(@Request() req: any) {
    return this.usersService.exportMe(req.user.userId);
  }

  /** PATCH /users/me/deactivate - pauses the account and removes it from discovery */
  @UseGuards(AuthGuard('jwt'))
  @Patch('me/deactivate')
  deactivateMe(@Request() req: any) {
    return this.usersService.deactivateMe(req.user.userId);
  }

  /** DELETE /users/me — permanently delete the currently authenticated user's account and all associated data */
  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  async deleteMe(@Request() req: any) {
    return this.usersService.removeMe(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/details')
  async getProfileDetails(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findProfileDetails(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateProfileDto) {
    return this.usersService.update(id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
