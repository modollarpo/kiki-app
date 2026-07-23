// POST /api/mobile/v1/campaigns
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const body = await request.json();
    const { 
      name, 
      description, 
      platform, 
      budget, 
      targetRoas, 
      targetCpa,
      startDate,
      endDate,
      dailyBudget,
      autoPause = true,
      smartBidding = true,
    } = body;

    // Validation
    if (!name || !platform) {
      return NextResponse.json(
        { ok: false, error: 'Name and platform are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const validPlatforms = ['meta', 'google', 'tiktok', 'snap', 'linkedin', 'pinterest'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid platform', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check budget limits
    const wallet = await db.prepare('SELECT balance FROM wallets WHERE tenant_id = ?').get(auth.tenantId) as { balance: number } | undefined;
    if (wallet && budget && budget > wallet.balance) {
      return NextResponse.json(
        { ok: false, error: 'Insufficient wallet balance', code: 'INSUFFICIENT_BALANCE' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(`
      INSERT INTO campaigns (
        id, tenant_id, name, description, platform, status,
        budget, target_roas, target_cpa, daily_budget,
        start_date, end_date, auto_pause, smart_bidding,
        spend, revenue, conversions, impressions, clicks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, ?)
    `).run(
      id,
      auth.tenantId,
      name,
      description || '',
      platform,
      budget || null,
      targetRoas || null,
      targetCpa || null,
      dailyBudget || null,
      startDate || null,
      endDate || null,
      autoPause ? 1 : 0,
      smartBidding ? 1 : 0,
      now,
      now
    );

    // Log creation
    await db.prepare(`
      INSERT INTO agent_actions (id, tenant_id, agent_type, action_type, details, created_at)
      VALUES (?, ?, 'campaign', 'created', ?, datetime('now'))
    `).run(crypto.randomUUID(), auth.tenantId, JSON.stringify({ campaignId: id, name }));

    // Return created campaign
    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;

    return NextResponse.json({
      ok: true,
      data: { campaign },
    }, { status: 201 });
  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create campaign', code: 'CREATE_FAILED' },
      { status: 500 }
    );
  }
}