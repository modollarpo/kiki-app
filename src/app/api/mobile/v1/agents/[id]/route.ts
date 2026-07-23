// GET /api/mobile/v1/agents/[id]
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

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

    const agent = await db.prepare(`
      SELECT * FROM agents WHERE id = ? AND tenant_id = ?
    `).get((await params).id, auth.tenantId) as any;

    if (!agent) {
      return NextResponse.json(
        { ok: false, error: 'Agent not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get recent actions
    const actions = await db.prepare(`
      SELECT * FROM agent_actions
      WHERE agent_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(id) as any[];

    // Get 30-day metrics
    const metrics = await db.prepare(`
      SELECT 
        COUNT(*) as total_actions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(duration_ms) as avg_duration
      FROM agent_actions
      WHERE agent_id = ? AND created_at >= date('now', '-30 days')
    `).get(id) as any;

    // Get daily activity for chart
    const dailyActivity = await db.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as actions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM agent_actions
      WHERE agent_id = ? AND created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date
    `).all(id) as any[];

    return NextResponse.json({
      ok: true,
      data: {
        agent: {
          ...agent,
          config: agent.config ? JSON.parse(agent.config) : {},
        },
        actions,
        metrics: {
          totalActions: metrics.total_actions || 0,
          completed: metrics.completed || 0,
          failed: metrics.failed || 0,
          avgDuration: metrics.avg_duration || 0,
          successRate: metrics.total_actions > 0 ? (metrics.completed / metrics.total_actions) * 100 : 0,
        },
        dailyActivity,
      },
    });
  } catch (error) {
    console.error('Get agent error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch agent', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}

// PATCH /api/mobile/v1/agents/[id] - Update agent status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const { id } = await params;
    const body = await request.json();
    const { status, config } = body;

    const db = await getDb();

    const agent = await db.prepare('SELECT * FROM agents WHERE id = ? AND tenant_id = ?').get((await params).id, auth.tenantId) as any;

    if (!agent) {
      return NextResponse.json(
        { ok: false, error: 'Agent not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (status && !['running', 'paused', 'stopped', 'error'].includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid status', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (config) {
      updates.push('config = ?');
      values.push(JSON.stringify({ ...JSON.parse(agent.config || '{}'), ...config }));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No valid updates', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    values.push((await params).id, auth.tenantId);
    await db.prepare(`UPDATE agents SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`).run(...values);

    // Log action
    await db.prepare(`
      INSERT INTO agent_actions (id, tenant_id, agent_id, agent_type, action_type, details, status, created_at)
      VALUES (?, ?, ?, ?, 'config_update', ?, 'completed', datetime('now'))
    `).run(crypto.randomUUID(), auth.tenantId, id, agent.type, JSON.stringify({ status, config }));

    const updatedAgent = await db.prepare('SELECT * FROM agents WHERE id = ?').get((await params).id) as any;

    return NextResponse.json({
      ok: true,
      data: { agent: updatedAgent },
    });
  } catch (error) {
    console.error('Update agent error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update agent', code: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
}