import { renderEmail } from '../mail/email-layout';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Agent } from '../agents/agent.entity';
import { CoinTransaction } from '../users/coin-transaction.entity';
import { PayoutAccount, PayoutMethod, PayoutOwnerType } from './payout-account.entity';

export const MIN_WITHDRAWAL_COINS = Math.max(1, Number(process.env.MIN_WITHDRAWAL_COINS || 500));
const MAX_SAVED_ACCOUNTS = 5;

export type PayoutInput = {
  method?: string;
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  ifsc?: string;
  upiId?: string;
};

export type WithdrawalRequest = {
  coins?: number;
  /** A saved account to pay out to... */
  accountId?: string;
  /** ...or new details, optionally saved for next time. */
  payout?: PayoutInput;
  saveAccount?: boolean;
};

type PayoutDetails = { method: PayoutMethod; accountHolder?: string; accountNumber?: string; bankName?: string; ifsc?: string; upiId?: string };

const UPI_PATTERN = /^[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/;

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

/** Validates and normalises bank or UPI details. */
function validatePayout(input: PayoutInput | undefined, options: { accountNumberOptional?: boolean } = {}): PayoutDetails {
  const method = clean(input?.method, 10).toLowerCase();
  if (method === 'upi') {
    const upiId = clean(input?.upiId, 255).toLowerCase();
    if (!UPI_PATTERN.test(upiId)) throw new BadRequestException('Enter a valid UPI ID, for example name@upi.');
    return { method, upiId };
  }
  if (method !== 'bank') throw new BadRequestException('Choose bank account or UPI.');
  const accountHolder = clean(input?.accountHolder, 120);
  const bankName = clean(input?.bankName, 120);
  const ifsc = clean(input?.ifsc, 11).toUpperCase();
  const accountNumber = String(input?.accountNumber ?? '').replace(/\s+/g, '');
  if (accountHolder.length < 2) throw new BadRequestException('Enter the account holder name.');
  if (bankName.length < 2) throw new BadRequestException('Enter the bank name.');
  if (!IFSC_PATTERN.test(ifsc)) throw new BadRequestException('Enter a valid 11-character IFSC code, for example SBIN0001234.');
  if (accountNumber || !options.accountNumberOptional) {
    if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) throw new BadRequestException('Enter a valid account number (9 to 18 digits).');
  }
  return { method, accountHolder, bankName, ifsc, accountNumber: accountNumber || undefined };
}

@Injectable()
export class PayoutsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(PayoutAccount) private readonly accounts: Repository<PayoutAccount>,
  ) {}

  // --- Encryption of stored account numbers --------------------------------

  private key() {
    const secret = process.env.CRYPTO_SECRET?.trim();
    if (!secret) throw new Error('CRYPTO_SECRET must be configured in .env');
    // Changing CRYPTO_SECRET makes saved account numbers unreadable; owners
    // would need to re-enter them.
    return createHash('sha256').update(`payout-accounts:${secret}`).digest();
  }

  private encrypt(plain: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
  }

  private decrypt(stored: string) {
    const [version, iv, tag, data] = stored.split(':');
    if (version !== 'v1') throw new BadRequestException('Saved account could not be read. Please add it again.');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  }

  // --- Saved accounts -------------------------------------------------------

  private publicAccount(account: PayoutAccount) {
    return {
      id: account.id,
      method: account.method,
      accountHolder: account.accountHolder,
      bankName: account.bankName,
      ifsc: account.ifsc,
      accountNumberMasked: account.accountNumberLast4 ? `XXXX${account.accountNumberLast4}` : null,
      upiId: account.upiId,
      updatedAt: account.updatedAt,
    };
  }

  private applyDetails(account: PayoutAccount, details: PayoutDetails) {
    account.method = details.method;
    account.accountHolder = details.method === 'bank' ? details.accountHolder ?? null : null;
    account.bankName = details.method === 'bank' ? details.bankName ?? null : null;
    account.ifsc = details.method === 'bank' ? details.ifsc ?? null : null;
    account.upiId = details.method === 'upi' ? details.upiId ?? null : null;
    if (details.method === 'upi') {
      account.accountNumberEncrypted = null;
      account.accountNumberLast4 = null;
    } else if (details.accountNumber) {
      account.accountNumberEncrypted = this.encrypt(details.accountNumber);
      account.accountNumberLast4 = details.accountNumber.slice(-4);
    }
  }

  async listAccounts(ownerType: PayoutOwnerType, ownerId: string) {
    const rows = await this.accounts.find({ where: { ownerType, ownerId }, order: { updatedAt: 'DESC' } });
    return rows.map((row) => this.publicAccount(row));
  }

  async createAccount(ownerType: PayoutOwnerType, ownerId: string, input: PayoutInput) {
    const details = validatePayout(input);
    if (await this.accounts.count({ where: { ownerType, ownerId } }) >= MAX_SAVED_ACCOUNTS) {
      throw new BadRequestException(`You can save up to ${MAX_SAVED_ACCOUNTS} accounts. Delete one to add another.`);
    }
    const account = this.accounts.create({ ownerType, ownerId });
    this.applyDetails(account, details);
    return this.publicAccount(await this.accounts.save(account));
  }

  /** Editing a bank account may leave the account number blank to keep the saved one. */
  async updateAccount(ownerType: PayoutOwnerType, ownerId: string, id: string, input: PayoutInput) {
    const account = await this.accounts.findOne({ where: { id, ownerType, ownerId }, select: { id: true, ownerType: true, ownerId: true, method: true, accountHolder: true, bankName: true, ifsc: true, accountNumberEncrypted: true, accountNumberLast4: true, upiId: true, createdAt: true, updatedAt: true } });
    if (!account) throw new NotFoundException('Saved account not found.');
    const keepNumber = input.method === 'bank' && account.method === 'bank' && Boolean(account.accountNumberEncrypted);
    const details = validatePayout(input, { accountNumberOptional: keepNumber });
    this.applyDetails(account, details);
    return this.publicAccount(await this.accounts.save(account));
  }

  async deleteAccount(ownerType: PayoutOwnerType, ownerId: string, id: string) {
    const result = await this.accounts.delete({ id, ownerType, ownerId });
    if (!result.affected) throw new NotFoundException('Saved account not found.');
    return { deleted: true };
  }

  private async payoutFor(ownerType: PayoutOwnerType, ownerId: string, request: WithdrawalRequest): Promise<PayoutDetails> {
    if (request.accountId) {
      const account = await this.accounts.findOne({
        where: { id: request.accountId, ownerType, ownerId },
        select: { id: true, method: true, accountHolder: true, bankName: true, ifsc: true, accountNumberEncrypted: true, upiId: true },
      });
      if (!account) throw new NotFoundException('Saved account not found.');
      if (account.method === 'upi') return { method: 'upi', upiId: account.upiId ?? undefined };
      return {
        method: 'bank',
        accountHolder: account.accountHolder ?? undefined,
        bankName: account.bankName ?? undefined,
        ifsc: account.ifsc ?? undefined,
        accountNumber: account.accountNumberEncrypted ? this.decrypt(account.accountNumberEncrypted) : undefined,
      };
    }
    const details = validatePayout(request.payout);
    if (request.saveAccount) await this.createAccount(ownerType, ownerId, request.payout ?? {});
    return details;
  }

  // --- Withdrawals ----------------------------------------------------------

  /**
   * Takes the coins from the owner's earned balance right away and records a
   * pending withdrawal; the super admin pays it manually and marks it paid,
   * or rejects it (which returns the coins).
   */
  async requestWithdrawal(ownerType: PayoutOwnerType, ownerId: string, request: WithdrawalRequest) {
    const coins = Number(request.coins);
    if (!Number.isInteger(coins) || coins < MIN_WITHDRAWAL_COINS || coins > 1_000_000) {
      throw new BadRequestException(`Minimum withdrawal is ${MIN_WITHDRAWAL_COINS} coins.`);
    }
    const payout = await this.payoutFor(ownerType, ownerId, request);
    const valuePaise = Math.max(1, Number(process.env.COIN_WITHDRAWAL_VALUE_PAISE || 100));

    const transaction = await this.dataSource.transaction(async (manager) => {
      const owner = ownerType === 'agent'
        ? await manager.getRepository(Agent).findOne({ where: { id: ownerId }, lock: { mode: 'pessimistic_write' } })
        : await manager.getRepository(User).findOne({ where: { id: ownerId }, lock: { mode: 'pessimistic_write' } });
      if (!owner) throw new NotFoundException('Account not found.');
      if (owner.earnedCoinBalance < coins) {
        throw new BadRequestException(`Your withdrawable balance is ${owner.earnedCoinBalance} coins.`);
      }
      owner.earnedCoinBalance -= coins;
      if (owner instanceof Agent) await manager.getRepository(Agent).save(owner);
      else await manager.getRepository(User).save(owner);
      return manager.getRepository(CoinTransaction).save(manager.getRepository(CoinTransaction).create({
        type: 'withdrawal',
        status: 'pending',
        userId: ownerType === 'user' ? ownerId : null,
        receiverId: ownerType === 'user' ? ownerId : null,
        agentId: ownerType === 'agent' ? ownerId : null,
        senderId: null,
        grossCoins: coins,
        userCoins: coins,
        platformCoins: 0,
        amountPaise: coins * valuePaise,
        label: `Manual ${payout.method} withdrawal${ownerType === 'agent' ? ' (agent)' : ''}`,
        payoutAccount: payout.method === 'upi' ? payout.upiId ?? null : payout.accountNumber ?? null,
        payoutDetails: JSON.stringify(payout),
        gatewayOrderId: null,
        gatewayPaymentId: null,
        gatewayPayoutId: null,
      }));
    });
    return {
      id: transaction.id,
      status: transaction.status,
      amountPaise: transaction.amountPaise,
      message: 'Withdrawal request submitted. Our team will transfer the amount and update the status.',
    };
  }

  /**
   * A member's wallet history, newest first, as signed amounts from their
   * point of view: purchases and earnings are positive, spending and
   * withdrawals negative. 'wallet' says which balance it affected.
   */
  async walletHistory(userId: string, limit = 50) {
    const rows = await this.dataSource.getRepository(CoinTransaction).createQueryBuilder('tx')
      .where('(tx.userId = :userId OR tx.senderId = :userId OR tx.receiverId = :userId)', { userId })
      .andWhere("NOT (tx.type = 'recharge' AND tx.status <> 'completed')")
      .orderBy('tx.createdAt', 'DESC')
      .take(limit)
      .getMany();
    return rows.map((tx) => {
      // Gifts and calls record the payer as senderId.
      const sent = tx.senderId === userId;
      let coins: number;
      let wallet: 'coins' | 'earnings';
      switch (tx.type) {
        case 'recharge': coins = tx.grossCoins; wallet = 'coins'; break;
        case 'admin_credit': coins = tx.userCoins || tx.grossCoins; wallet = 'coins'; break;
        case 'withdrawal': coins = -tx.grossCoins; wallet = 'earnings'; break;
        case 'gift':
        case 'call': coins = sent ? -tx.grossCoins : tx.userCoins; wallet = sent ? 'coins' : 'earnings'; break;
        default: coins = -tx.grossCoins; wallet = 'coins';
      }
      return { id: tx.id, type: tx.type, status: tx.status, label: tx.label, coins, wallet, createdAt: tx.createdAt };
    });
  }

  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(PayoutsService.name);

  private mailer() {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;
    if (!host || !user || !pass) return null;
    const port = Number(process.env.SMTP_PORT || 465);
    this.transporter = nodemailer.createTransport({ host, port, secure: (process.env.SMTP_SECURE || String(port === 465)).toLowerCase() === 'true', auth: { user, pass } });
    return this.transporter;
  }

  /**
   * Emails the member or agent when the super admin marks their withdrawal
   * paid or rejected. Never throws: the status change has already happened.
   */
  async notifyWithdrawalStatus(transactionId: string) {
    try {
      const tx = await this.dataSource.getRepository(CoinTransaction).findOne({ where: { id: transactionId } });
      if (!tx || tx.type !== 'withdrawal' || (tx.status !== 'completed' && tx.status !== 'rejected')) return;
      const owner = tx.userId
        ? await this.dataSource.getRepository(User).findOne({ where: { id: tx.userId }, select: { id: true, name: true, email: true } })
        : tx.agentId
          ? await this.dataSource.getRepository(Agent).findOne({ where: { id: tx.agentId }, select: { id: true, name: true, email: true } })
          : null;
      const mailer = this.mailer();
      if (!owner?.email || !mailer) return;
      let details: Partial<PayoutDetails> = {};
      try { details = tx.payoutDetails ? JSON.parse(tx.payoutDetails) : {}; } catch { /* old rows */ }
      const destination = details.method === 'upi'
        ? `UPI ${details.upiId}`
        : [details.bankName, details.accountNumber ? `account ending ${String(details.accountNumber).slice(-4)}` : null].filter(Boolean).join(', ');
      const rupees = `₹${((tx.amountPaise ?? tx.grossCoins * 100) / 100).toLocaleString('en-IN')}`;
      const paid = tx.status === 'completed';
      const subject = paid ? `Your ConnectLove withdrawal of ${rupees} has been paid` : 'Your ConnectLove withdrawal could not be processed';
      const email = renderEmail(paid
        ? {
          preheader: `${rupees} is on its way to your account`,
          title: 'Your withdrawal has been paid',
          greeting: `Hi ${owner.name},`,
          paragraphs: ['We have sent your money. Depending on your bank it can take a few hours to show up.'],
          highlight: { label: 'Amount paid', value: rupees },
          details: [{ label: 'Coins', value: String(tx.grossCoins) }, { label: 'Sent to', value: destination || 'Your account' }],
        }
        : {
          preheader: 'Your coins have been returned to your earnings',
          title: 'Your withdrawal could not be processed',
          greeting: `Hi ${owner.name},`,
          paragraphs: [`We could not complete this withdrawal, so the ${tx.grossCoins} coins have been returned to your earnings. Please check your account details and try again, or contact support.`],
          details: [{ label: 'Amount', value: rupees }, { label: 'Account', value: destination || 'Your account' }],
        });
      await mailer.sendMail({
        from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim(),
        to: owner.email,
        subject,
        ...email,
      });
    } catch (error) {
      this.logger.warn(`Withdrawal email for ${transactionId} failed: ${String(error)}`);
    }
  }

  /** The owner's latest withdrawal requests with masked account details. */
  async withdrawals(ownerType: PayoutOwnerType, ownerId: string) {
    const rows = await this.dataSource.getRepository(CoinTransaction).find({
      where: ownerType === 'agent' ? { type: 'withdrawal', agentId: ownerId } : { type: 'withdrawal', userId: ownerId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return {
      minimum: MIN_WITHDRAWAL_COINS,
      items: rows.map((row) => {
        let details: Partial<PayoutDetails> = {};
        try { details = row.payoutDetails ? JSON.parse(row.payoutDetails) : {}; } catch { /* old rows */ }
        return {
          id: row.id,
          coins: row.grossCoins,
          amountPaise: row.amountPaise,
          status: row.status,
          createdAt: row.createdAt,
          method: details.method ?? null,
          account: details.method === 'upi'
            ? details.upiId ?? null
            : [details.bankName, details.accountNumber ? `XXXX${String(details.accountNumber).slice(-4)}` : null].filter(Boolean).join(' · ') || null,
        };
      }),
    };
  }
}
