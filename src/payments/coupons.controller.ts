import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { Coupon, type CouponPlan } from './coupon.entity';

type CouponInput = { code?: string; discountPercent?: number; applicablePlan?: CouponPlan; expiresAt?: string | null; maxUses?: number | null; active?: boolean };

@Controller('api/coupons')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin')
export class CouponsController {
  constructor(@InjectRepository(Coupon) private readonly coupons: Repository<Coupon>) {}

  @Get()
  list() { return this.coupons.find({ order: { createdAt: 'DESC' } }); }

  private values(body: CouponInput, partial = false) {
    const result: Partial<Coupon> = {};
    if (!partial || body.code !== undefined) {
      const code = String(body.code || '').trim().toUpperCase();
      if (!/^[A-Z0-9@_-]{3,32}$/.test(code)) throw new BadRequestException('Coupon code must be 3-32 letters, numbers, @, _ or -.');
      result.code = code;
    }
    if (!partial || body.discountPercent !== undefined) {
      const discount = Number(body.discountPercent);
      if (!Number.isInteger(discount) || discount < 1 || discount > 99) throw new BadRequestException('Discount must be between 1% and 99%.');
      result.discountPercent = discount;
    }
    if (body.applicablePlan !== undefined || !partial) {
      const plan = body.applicablePlan || 'all';
      if (!['all', 'gold', 'platinum'].includes(plan)) throw new BadRequestException('Invalid applicable plan.');
      result.applicablePlan = plan;
    }
    if (body.expiresAt !== undefined) {
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new BadRequestException('Invalid expiry date.');
      if (expiresAt && expiresAt.getTime() <= Date.now()) throw new BadRequestException('Expiry date must be in the future.');
      result.expiresAt = expiresAt;
    }
    if (body.maxUses !== undefined) {
      const maxUses = body.maxUses === null ? null : Number(body.maxUses);
      if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new BadRequestException('Usage limit must be at least 1.');
      result.maxUses = maxUses;
    }
    if (body.active !== undefined) result.active = Boolean(body.active);
    return result;
  }

  @Post()
  async create(@Body() body: CouponInput) {
    try { return await this.coupons.save(this.coupons.create(this.values(body))); }
    catch (error: any) { if (error?.code === 'ER_DUP_ENTRY') throw new BadRequestException('This coupon code already exists.'); throw error; }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: CouponInput) {
    const coupon = await this.coupons.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found.');
    Object.assign(coupon, this.values(body, true));
    try { return await this.coupons.save(coupon); }
    catch (error: any) { if (error?.code === 'ER_DUP_ENTRY') throw new BadRequestException('This coupon code already exists.'); throw error; }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const coupon = await this.coupons.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found.');
    if (coupon.usedCount > 0) { coupon.active = false; await this.coupons.save(coupon); return { deactivated: true }; }
    await this.coupons.remove(coupon);
    return { deleted: true };
  }
}
