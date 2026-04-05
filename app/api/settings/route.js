import { sql } from '@vercel/postgres';
import { NextResponse } from '@/bugTracker/node_modules/next/server';

export async function GET() {
  try {
    const { rows } = await sql`SELECT data FROM settings WHERE id = 1`;
    if (rows.length === 0) {
      return NextResponse.json({
        assignees: ["Unassigned"],
        statuses: ["Open", "Closed"],
        priorities: ["Low", "High"],
        projects: ["General"]
      });
    }
    return NextResponse.json(rows[0].data);
  } catch (error) {
    console.error("Error loading Postgres settings", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    await sql`
      INSERT INTO settings (id, data) 
      VALUES (1, ${JSON.stringify(data)})
      ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(data)}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving Postgres settings", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
