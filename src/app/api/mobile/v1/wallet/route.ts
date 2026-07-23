// GET /api/mobile/v1/wallet
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const db = await getDb();

    // Get wallet
    const wallet = await db.prepare(`
      SELECT * FROM wallets WHERE tenant_id = ?
    `).get(auth.tenantId) as any;

    if (!wallet) {
      return NextResponse.json(
        { ok: false, error: 'Wallet not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get recent transactions
    const transactions = await db.prepare(`
      SELECT * FROM wallet_transactions
      WHERE wallet_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(wallet.id) as any[];

    // Get payment methods
    const paymentMethods = await db.prepare(`
      SELECT * FROM payment_methods
      WHERE tenant_id = ? AND status = 'active'
      ORDER BY is_default DESC, created_at DESC
    `).all(auth.tenantId) as any[];

    // Get this month's stats
    const stats = await db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
        COUNT(*) as transaction_count
      FROM wallet_transactions
      WHERE wallet_id = ? AND created_at >= date('now', 'start of month')
    `).get(wallet.id) as any;

    return NextResponse.json({
      ok: true,
      data: {
        wallet: {
          ...wallet,
          balance: wallet.balance / 100, // Convert from cents
        },
        transactions: transactions.map(t => ({
          ...t,
          amount: t.amount / 100,
        })),
        paymentMethods,
        stats: {
          creditsThisMonth: (stats.total_credits || 0) / 100,
          debitsThisMonth: (stats.total_debits || 0) / 100,
          transactionCount: stats.transaction_count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch wallet', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}