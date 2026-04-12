import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const getSQL = () => neon(process.env.DATABASE_URL);

export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = getSQL();
  try {
    const rows = await sql`SELECT data FROM settings WHERE id = 1`;
    if (rows.length === 0) return NextResponse.json({ error: "Settings not found" }, { status: 404 });
    return NextResponse.json(rows[0].data);
  } catch (error) {
    console.error('Neon Settings GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const sql = getSQL();
  try {
    const newData = await request.json();
    await sql`UPDATE settings SET data = ${JSON.stringify(newData)} WHERE id = 1`;
    return NextResponse.json({ success: true, data: newData });
  } catch (error) {
    console.error('Neon Settings PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
