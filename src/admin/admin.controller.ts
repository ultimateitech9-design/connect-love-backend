import { Controller, Get, Patch, Param, Body, Query, UseGuards, Post, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { CreateManagementUserDto } from './dto/create-management-user.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.getAllUsers(+page, +limit);
  }

  @Post('management-users')
  createManagementUser(@Body() body: CreateManagementUserDto, @Req() request: Request) {
    return this.adminService.createManagementUser(body, (request.user as any)?.role);
  }

  @Patch('users/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Get('contacts')
  getContacts() {
    return this.adminService.getAllContacts();
  }

  @Get('payments')
  getPayments() {
    return this.adminService.getPayments();
  }

  @Get('verification')
  getVerificationQueue() {
    return this.adminService.getVerificationQueue();
  }

  @Get('subscriptions')
  getSubscriptions() {
    return this.adminService.getSubscriptions();
  }

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getAnalytics();
  }
}
