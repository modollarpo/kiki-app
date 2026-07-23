// POST /api/mobile/v1/wallet/transactions - Add funds or withdraw
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const body = await request.json();
    const { type, amount, paymentMethodId, description } = body;

    if (!type || !['credit', 'debit'].includes(type)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid transaction type', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Invalid amount', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get wallet
    const wallet = await db.prepare('SELECT * FROM wallets WHERE tenant_id = ?').get(auth.tenantId) as any;
    if (!wallet) {
      return NextResponse.json(
        { ok: false, error: 'Wallet not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const amountCents = Math.round(amount * 100);

    // Check balance for withdrawals
    if (type === 'debit' && wallet.balance < amountCents) {
      return NextResponse.json(
        { ok: false, error: 'Insufficient balance', code: 'INSUFFICIENT_FUNDS' },
        { status: 400 }
      );
    }

    // Verify payment method
    const paymentMethod = await db.prepare(`
      SELECT * FROM payment_methods WHERE id = ? AND tenant_id = ? AND status = 'active'
    `).get(paymentMethodId, auth.tenantId) as any;

    if (!paymentMethod) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payment method', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const transactionId = crypto.randomUUID();
    const newBalance = type === 'credit' ? wallet.balance + amountCents : wallet.balance - amountCents;

    // Start transaction
    await db.exec('BEGIN TRANSACTION');

    try {
      // Update wallet balance
      await db.prepare('UPDATE wallets SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newBalance, wallet.id);

      // Create transaction record
      await db.prepare(`
        INSERT INTO wallet_transactions (id, wallet_id, tenant_id, type, amount, currency, status, description, payment_method_id, created_at)
        VALUES (?, ?, ?, ?, ?, 'USD', 'completed', ?, ?, datetime('now'))
      `).run(transactionId, wallet.id, auth.tenantId, type, amountCents, description || `${type} via ${paymentMethod.type}`, paymentMethodId);

      // Log action
      await db.prepare(`
        INSERT INTO agent_actions (id, tenant_id, agent_type, action_type, details, status, created_at)
        VALUES (?, ?, 'wallet', 'transaction', ?, 'completed', datetime('now'))
      `).run(crypto.randomUUID(), auth.tenantId, JSON.stringify({ type, amount, transactionId }));

      await db.exec('COMMIT');

      return NextResponse.json({
        ok: true,
        data: {
          transaction: {
            id: transactionId,
            type,
            amount,
            currency: 'USD',
            status: 'completed',
            description: description || `${type} via ${paymentMethod.type}`,
            createdAt: new Date().toISOString(),
          },
          newBalance: newBalance / 100,
        },
      });
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Transaction error:', error);
    return NextResponse.json(
      { ok: false, error: 'Transaction failed', code: 'TRANSACTION_FAILED' },
      { status: 500 }
    );
  }
}