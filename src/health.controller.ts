import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PlatformSetting } from './platform/platform-setting.entity';

@Controller('api')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'SoulMatch API', timestamp: new Date().toISOString() };
  }

  @Get('maintenance-status')
  async maintenanceStatus() {
    const setting = await this.dataSource.getRepository(PlatformSetting).findOne({
      where: { key: 'platform_flags' },
    });
    const flags = (setting?.value || {}) as Record<string, boolean>;
    return { maintenanceMode: flags.maintenanceMode ?? false };
  }
}
