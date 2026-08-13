import { BadGatewayException, BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'crypto';
import { request as httpsRequest } from 'https';
import { DataSource, Repository } from 'typeorm';
import { CoinTransaction } from './coin-transaction.entity';
import { User } from './user.entity';

@Injectable()
export class WalletPaymentsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CoinTransaction) private readonly transactions: Repository<CoinTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  private coinPricePaise() { return Math.max(1, Number(process.env.COIN_PRICE_PAISE || 100)); }
  private withdrawalValuePaise() { return Math.max(1, Number(process.env.COIN_WITHDRAWAL_VALUE_PAISE || 100)); }
  private credentials() {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim(); const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret || keyId.includes('replace_me')) throw new ServiceUnavailableException('Razorpay payment gateway is not configured.');
    return { keyId, keySecret };
  }
  private payoutCredentials() {
    // RazorpayX normally uses the same Razorpay API keys once RazorpayX is
    // enabled for the merchant account. Dedicated RazorpayX names remain
    // supported for accounts that use separate credentials.
    const keyId = process.env.RAZORPAYX_KEY_ID?.trim() || process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAYX_KEY_SECRET?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim();
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER?.trim() || process.env.RAZORPAY_ACCOUNT_NUMBER?.trim();
    if (!keyId || !keySecret || !accountNumber || keyId.includes('replace_me') || accountNumber.includes('replace_me')) {
      throw new ServiceUnavailableException('Withdrawals are not live yet. Configure the approved RazorpayX payout account on the server.');
    }
    return { keyId, keySecret, accountNumber };
  }
  private gateway(path: string, credentials: { keyId: string; keySecret: string }, method = 'GET', body?: unknown): Promise<any> {
    const raw = body === undefined ? undefined : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = httpsRequest({ hostname: 'api.razorpay.com', path: `/v1${path}`, method, headers: { Authorization: `Basic ${Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64')}`, 'Content-Type': 'application/json', ...(raw ? { 'Content-Length': Buffer.byteLength(raw) } : {}) } }, (res) => {
        const chunks: Buffer[] = []; res.on('data', (chunk: Buffer) => chunks.push(chunk)); res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8'); let response: any = {}; try { response = text ? JSON.parse(text) : {}; } catch {}
          if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) return reject(new BadGatewayException(response?.error?.description || 'Payment gateway request failed.'));
          resolve(response);
        });
      });
      req.setTimeout(15000, () => req.destroy(new Error('Payment gateway timeout'))); req.on('error', () => reject(new BadGatewayException('Could not connect to the payment gateway.'))); if (raw) req.write(raw); req.end();
    });
  }
  private validSignature(expected: string, received: string) { const a = Buffer.from(expected); const b = Buffer.from(received || ''); return a.length === b.length && timingSafeEqual(a, b); }

  async createRechargeOrder(userId: string, amount: number) {
    const coins = Number(amount); if (!Number.isInteger(coins) || coins < 10 || coins > 100000) throw new BadRequestException('Recharge between 10 and 100000 coins.');
    const user = await this.users.findOne({ where: { id: userId } }); if (!user) throw new NotFoundException('User not found.');
    const amountPaise = coins * this.coinPricePaise();
    const transaction = await this.transactions.save(this.transactions.create({ type: 'recharge', status: 'pending', userId, senderId: null, receiverId: null, grossCoins: coins, userCoins: coins, platformCoins: 0, amountPaise, label: 'Razorpay wallet recharge', payoutAccount: null, gatewayOrderId: null, gatewayPaymentId: null, gatewayPayoutId: null }));
    try {
      const order = await this.gateway('/orders', this.credentials(), 'POST', { amount: amountPaise, currency: 'INR', receipt: transaction.id, notes: { walletTransactionId: transaction.id, userId, coins: String(coins) } });
      transaction.gatewayOrderId = order.id; await this.transactions.save(transaction);
      return { keyId: this.credentials().keyId, orderId: order.id, amount: amountPaise, currency: 'INR', coins, customer: { name: user.name, email: user.email } };
    } catch (error) { transaction.status = 'rejected'; await this.transactions.save(transaction); throw error; }
  }

  async verifyRecharge(userId: string, body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) {
    const orderId = body.razorpay_order_id || ''; const paymentId = body.razorpay_payment_id || ''; const signature = body.razorpay_signature || '';
    if (!orderId || !paymentId || !signature) throw new BadRequestException('Incomplete payment response.');
    const transaction = await this.transactions.findOne({ where: { gatewayOrderId: orderId, userId, type: 'recharge' } });
    if (!transaction) throw new NotFoundException('Recharge payment was not found.');
    const expected = createHmac('sha256', this.credentials().keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    if (!this.validSignature(expected, signature)) throw new BadRequestException('Invalid payment signature.');
    const payment = await this.gateway(`/payments/${paymentId}`, this.credentials());
    if (payment.order_id !== orderId || payment.amount !== transaction.amountPaise || payment.currency !== 'INR') throw new BadRequestException('Payment details do not match this recharge.');
    if (payment.status === 'authorized') await this.gateway(`/payments/${paymentId}/capture`, this.credentials(), 'POST', { amount: transaction.amountPaise, currency: 'INR' });
    return this.completeRecharge(transaction.id, paymentId);
  }

  private async completeRecharge(transactionId: string, paymentId: string) {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await manager.getRepository(CoinTransaction).findOne({ where: { id: transactionId }, lock: { mode: 'pessimistic_write' } });
      if (!transaction) throw new NotFoundException('Recharge transaction was not found.');
      if (transaction.status === 'completed') return { success: true, coinBalance: (await manager.getRepository(User).findOne({ where: { id: transaction.userId! } }))?.coinBalance || 0 };
      if (transaction.status !== 'pending') throw new BadRequestException('This recharge can no longer be completed.');
      const user = await manager.getRepository(User).findOne({ where: { id: transaction.userId! }, lock: { mode: 'pessimistic_write' } }); if (!user) throw new NotFoundException('User not found.');
      user.coinBalance += transaction.userCoins; transaction.gatewayPaymentId = paymentId; transaction.status = 'completed'; await manager.getRepository(User).save(user); await manager.getRepository(CoinTransaction).save(transaction);
      return { success: true, coinsAdded: transaction.userCoins, coinBalance: user.coinBalance };
    });
  }

  async requestWithdrawal(userId: string, amount: number, upiId: string) {
    const coins = Number(amount); const address = String(upiId || '').trim().toLowerCase();
    if (!Number.isInteger(coins) || coins < 50) throw new BadRequestException('Minimum withdrawal is 50 coins.');
    if (!/^[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}$/.test(address)) throw new BadRequestException('Enter a valid UPI ID, for example name@upi.');
    const config = this.payoutCredentials();
    const transaction = await this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({ where: { id: userId }, lock: { mode: 'pessimistic_write' } }); if (!user) throw new NotFoundException('User not found.');
      if (user.earnedCoinBalance < coins) throw new BadRequestException('Only gift earnings can be withdrawn. Your earned balance is too low.');
      user.earnedCoinBalance -= coins; await manager.getRepository(User).save(user);
      return manager.getRepository(CoinTransaction).save(manager.getRepository(CoinTransaction).create({ type: 'withdrawal', status: 'pending', userId, senderId: null, receiverId: userId, grossCoins: coins, userCoins: coins, platformCoins: 0, amountPaise: coins * this.withdrawalValuePaise(), label: 'RazorpayX UPI withdrawal', payoutAccount: address, gatewayOrderId: null, gatewayPaymentId: null, gatewayPayoutId: null }));
    });
    try {
      const user = await this.users.findOne({ where: { id: userId } });
      const contact = await this.gateway('/contacts', config, 'POST', { name: user?.name || 'ConnectLove user', email: user?.email || undefined, type: 'customer', reference_id: userId.slice(0, 40) });
      const fundAccount = await this.gateway('/fund_accounts', config, 'POST', { contact_id: contact.id, account_type: 'vpa', vpa: { address } });
      const payout = await this.gateway('/payouts', config, 'POST', { account_number: config.accountNumber, fund_account_id: fundAccount.id, amount: transaction.amountPaise, currency: 'INR', mode: 'UPI', purpose: 'payout', queue_if_low_balance: true, reference_id: transaction.id, narration: 'ConnectLove gift earnings' });
      transaction.gatewayPayoutId = payout.id; transaction.status = payout.status === 'processed' ? 'completed' : 'pending'; await this.transactions.save(transaction);
      return { id: transaction.id, status: transaction.status, amountPaise: transaction.amountPaise, message: transaction.status === 'completed' ? 'Payout sent successfully.' : 'Withdrawal is being processed.' };
    } catch (error) { await this.rejectWithdrawal(transaction.id); throw error; }
  }

  private async rejectWithdrawal(id: string) { await this.dataSource.transaction(async (manager) => { const tx = await manager.getRepository(CoinTransaction).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } }); if (!tx || tx.status !== 'pending') return; const user = tx.userId ? await manager.getRepository(User).findOne({ where: { id: tx.userId }, lock: { mode: 'pessimistic_write' } }) : null; if (user) { user.earnedCoinBalance += tx.grossCoins; await manager.getRepository(User).save(user); } tx.status = 'rejected'; await manager.getRepository(CoinTransaction).save(tx); }); }

  async handleWebhook(raw: Buffer | undefined, body: any, signature?: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim(); if (!secret || !raw || !signature) throw new BadRequestException('Webhook verification is not configured.');
    const expected = createHmac('sha256', secret).update(raw).digest('hex'); if (!this.validSignature(expected, signature)) throw new BadRequestException('Invalid webhook signature.');
    const event = String(body?.event || ''); const payout = body?.payload?.payout?.entity;
    if (payout?.reference_id && event.startsWith('payout.')) { const tx = await this.transactions.findOne({ where: { id: payout.reference_id, type: 'withdrawal' } }); if (tx) { if (payout.id) { tx.gatewayPayoutId = payout.id; await this.transactions.save(tx); } if (event === 'payout.processed') { tx.status = 'completed'; await this.transactions.save(tx); } if (event === 'payout.failed' || event === 'payout.reversed') await this.rejectWithdrawal(tx.id); } }
    return { received: true };
  }
}
