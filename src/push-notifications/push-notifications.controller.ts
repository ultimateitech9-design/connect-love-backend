import { Body, Controller, Delete, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UnregisterDeviceDto } from './dto/unregister-device.dto';
import { PushNotificationsService } from './push-notifications.service';

@Controller('push')
@UseGuards(AuthGuard('jwt'))
export class PushNotificationsController {
  constructor(private readonly pushNotifications: PushNotificationsService) {}

  @Post('devices')
  registerDevice(@Request() req: any, @Body() dto: RegisterDeviceDto) {
    return this.pushNotifications.registerDevice(req.user.userId, dto);
  }

  @Get('devices')
  listDevices(@Request() req: any) {
    return this.pushNotifications.listDevices(req.user.userId);
  }

  @Delete('devices')
  unregisterDevice(@Request() req: any, @Body() dto: UnregisterDeviceDto) {
    return this.pushNotifications.unregisterDevice(req.user.userId, dto);
  }

  @Delete('devices/all')
  unregisterAllDevices(@Request() req: any) {
    return this.pushNotifications.unregisterAllDevices(req.user.userId);
  }
}
