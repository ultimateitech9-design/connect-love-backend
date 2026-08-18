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

function readableDetail(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    const messages = value.map(readableDetail).filter((item): item is string => Boolean(item));
    return messages.length ? messages.join(' ') : null;
  }
  if (value && typeof value === 'object') {
    const detail = value as Record<string, unknown>;
    return readableDetail(detail.msg) || readableDetail(detail.message) || readableDetail(detail.detail);
  }
  return null;
}

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

    // The API and face worker share this URL/secret pair through their local env files.
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
          // The face worker accepts at most five reference photos while paid
          // and women profiles may contain up to ten.
          reference_images: user.photos.slice(0, 5),
          live_frames: liveFrames,
        }),
        signal: controller.signal,
      });
    } catch {
      throw new ServiceUnavailableException('Face verification service is unavailable.');
    } finally {
      clearTimeout(timeout);
    }

    const result = await response.json().catch(() => null) as FaceVerificationResult | { detail?: unknown } | null;
    if (!response.ok) {
      const detail = readableDetail(result && 'detail' in result ? result.detail : result);
      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException(detail || 'Use a clear solo profile photo and keep your face visible during recording.');
      }
      throw new BadGatewayException(detail || 'Face verification could not be completed. Please try again.');
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
