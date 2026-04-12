import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const getSQL = () => neon(process.env.DATABASE_URL);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const sql = getSQL();
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    
    if (!user) return NextResponse.json({ notifications: [] });

    const rows = await sql`
      SELECT * FROM notifications 
      WHERE target_user = ${user} 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    return NextResponse.json({ success: true, notifications: rows });
  } catch (error) {
    console.error('Neon Notification Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const sql = getSQL();
  try {
    const { target_user, actor, bug_id, message } = await request.json();
    await sql`
      INSERT INTO notifications (target_user, actor, bug_id, message)
      VALUES (${target_user}, ${actor}, ${bug_id}, ${message})
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const sql = getSQL();
  try {
    const { id } = await request.json();
    await sql`UPDATE notifications SET is_read = TRUE WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
