// GET /api/mobile/v1/campaigns/[id]
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

interface CampaignDetailRow {
  id: string;
  tenant_id: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
  clicks: number;
  impressions: number;
  cpa: number;
  ctr: number;
  start_date: string | null;
  end_date: string | null;
  auto_pause: number;
  smart_bidding: number;
  created_at: string;
  updated_at: string;
}

interface CampaignPerfRow {
  date: string;
  spend: number;
  revenue: number;
  conversions: number;
  impressions: number;
  clicks: number;
}

interface SignalRow {
  id: string;
  tenant_id: string;
  campaign_id?: string;
  platform: string;
  event_type: string;
  value: number;
  created_at: string;
}

interface BidChangeRow {
  id: string;
  campaign_id: string;
  old_bid: number;
  new_bid: number;
  reason: string;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const { id } = await params;
    const db = await getDb();

    const campaign = await db.prepare(`
      SELECT c.*, 
        CASE WHEN c.spend > 0 THEN c.revenue / c.spend ELSE 0 END as roas,
        CASE WHEN c.conversions > 0 THEN c.spend / c.conversions ELSE 0 END as cpa,
        CASE WHEN c.impressions > 0 THEN (c.clicks / c.impressions) * 100 ELSE 0 END as ctr
      FROM campaigns c
      WHERE c.id = ? AND c.tenant_id = ?
    `).get<CampaignDetailRow>((await params).id, auth.tenantId);

    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: 'Campaign not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get recent performance
    const performance = await db.prepare(`
      SELECT 
        strftime('%Y-%m-%d', created_at) as date,
        SUM(spend) as spend,
        SUM(revenue) as revenue,
        SUM(conversions) as conversions,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks
      FROM campaigns
      WHERE tenant_id = ? AND id = ? AND created_at >= date('now', '-30 days')
      GROUP BY date
      ORDER BY date
    `).all<CampaignPerfRow>(auth.tenantId, (await params).id);

    // Get recent signals
    const signals = await db.prepare(`
      SELECT * FROM signals
      WHERE tenant_id = ? AND campaign_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all<SignalRow>(auth.tenantId, (await params).id);

    // Get bid history
    const bidHistory = await db.prepare(`
      SELECT * FROM bid_changes
      WHERE campaign_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all<BidChangeRow>((await params).id);

    return NextResponse.json({
      ok: true,
      data: {
        campaign: {
          ...campaign,
          roas: parseFloat(campaign.roas?.toFixed(2) || '0'),
          cpa: parseFloat(campaign.cpa?.toFixed(2) || '0'),
          ctr: parseFloat(campaign.ctr?.toFixed(2) || '0'),
        },
        performance: performance.map(p => ({
          ...p,
          roas: p.spend > 0 ? parseFloat((p.revenue / p.spend).toFixed(2)) : 0,
          cpa: p.conversions > 0 ? parseFloat((p.spend / p.conversions).toFixed(2)) : 0,
        })),
        signals,
        bidHistory,
      },
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch campaign', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}