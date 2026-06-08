import { Controller, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfilePhotosService } from './profile-photos.service';
import { UpdatePhotosDto } from './update-photos.dto';

@Controller('user/profile')
@UseGuards(AuthGuard('jwt'))
export class ProfilePhotosController {
  constructor(private readonly profilePhotosService: ProfilePhotosService) {}

  @Patch('photos')
  async updatePhotos(@Request() req: any, @Body() updatePhotosDto: UpdatePhotosDto) {
    return this.profilePhotosService.updatePhotos(req.user.userId, updatePhotosDto.photos || []);
  }
}
