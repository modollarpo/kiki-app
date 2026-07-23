// GET /api/mobile/v1/agents
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireMobileAuth } from '@/lib/mobile/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const db = await getDb();

    const agents = await db.prepare(`
      SELECT a.*, 
        (SELECT COUNT(*) FROM agent_actions WHERE agent_id = a.id) as action_count,
        (SELECT action_type FROM agent_actions WHERE agent_id = a.id ORDER BY created_at DESC LIMIT 1) as last_action,
        (SELECT created_at FROM agent_actions WHERE agent_id = a.id ORDER BY created_at DESC LIMIT 1) as last_action_at
      FROM agents a
      WHERE a.tenant_id = ?
      ORDER BY a.created_at DESC
    `).all(auth.tenantId) as any[];

    // Get metrics for each agent
    const agentsWithMetrics = await Promise.all(agents.map(async (agent) => {
      const metrics = await db.prepare(`
        SELECT 
          COUNT(*) as total_actions,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          AVG(duration_ms) as avg_duration
        FROM agent_actions
        WHERE agent_id = ? AND created_at >= date('now', '-30 days')
      `).get(agent.id) as any;

      return {
        ...agent,
        metrics: {
          totalActions: metrics.total_actions || 0,
          completed: metrics.completed || 0,
          failed: metrics.failed || 0,
          avgDuration: metrics.avg_duration || 0,
          successRate: metrics.total_actions > 0 ? (metrics.completed / metrics.total_actions) * 100 : 0,
        },
      };
    }));

    const summary = {
      total: agents.length,
      running: agents.filter(a => a.status === 'running').length,
      paused: agents.filter(a => a.status === 'paused').length,
      stopped: agents.filter(a => a.status === 'stopped').length,
      error: agents.filter(a => a.status === 'error').length,
      totalActions: agentsWithMetrics.reduce((sum, a) => sum + a.metrics.totalActions, 0),
    };

    return NextResponse.json({
      ok: true,
      data: { agents: agentsWithMetrics, summary },
    });
  } catch (error) {
    console.error('Get agents error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch agents', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}