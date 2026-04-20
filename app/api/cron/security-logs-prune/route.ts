import { NextRequest, NextResponse } from 'next/server';
import { deleteSecurityLogsBefore } from '@/lib/db/queries';

/** Elimina log di sicurezza più vecchi di 6 mesi. Protezione: CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  const beforeIso = cutoff.toISOString();

  const deleted = deleteSecurityLogsBefore(beforeIso);

  return NextResponse.json({
    ok: true,
    deleted,
    before: beforeIso,
  });
}
