import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

const MATCH_THRESHOLD = 60;

type FaceVerificationResult = {
  matched: boolean;
  score: number;
  bestScore: number;
  passingFrames: number;
  requiredFrames: number;
  referenceFaces: number;
  motionDetected: boolean;
};

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async verify(userId: string, liveFrames: string[]) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (!user.photos?.length) {
      throw new BadRequestException('Upload at least one profile photo before video KYC.');
    }

    const serviceUrl = process.env.FACE_SERVICE_URL || 'http://127.0.0.1:8001';
    const secret = process.env.FACE_SERVICE_SECRET || '';
    if (!secret) {
      throw new ServiceUnavailableException('Face verification service is not configured.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let response: Response;
    try {
      response = await fetch(`${serviceUrl.replace(/\/$/, '')}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': secret,
        },
        body: JSON.stringify({
          reference_images: user.photos,
          live_frames: liveFrames,
        }),
        signal: controller.signal,
      });
    } catch {
      throw new ServiceUnavailableException('Face verification service is unavailable.');
    } finally {
      clearTimeout(timeout);
    }

    const result = await response.json().catch(() => null) as FaceVerificationResult | { detail?: string } | null;
    if (!response.ok) {
      const detail = result && 'detail' in result ? result.detail : null;
      throw new BadGatewayException(detail || 'Face verification could not be completed.');
    }

    const verified = result as FaceVerificationResult;
    const matched = Boolean(
      verified.matched
      && verified.motionDetected
      && Number(verified.score) >= MATCH_THRESHOLD,
    );

    await this.userRepo.update(userId, {
      kycLivePhoto: liveFrames[0],
      kycMatched: matched,
      kycMatchScore: Math.max(0, Math.min(100, Math.round(Number(verified.score) || 0))),
      kycVerifiedAt: matched ? new Date() : null,
      isVerified: matched,
    });

    return {
      matched,
      score: Math.round(Number(verified.score) || 0),
      requiredScore: MATCH_THRESHOLD,
      passingFrames: verified.passingFrames,
      requiredFrames: verified.requiredFrames,
      referenceFaces: verified.referenceFaces,
      motionDetected: verified.motionDetected,
      kycLivePhoto: liveFrames[0],
    };
  }
}
