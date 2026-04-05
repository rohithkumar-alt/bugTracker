import { sql } from '@vercel/postgres';
import { NextResponse } from '@/bugTracker/node_modules/next/server';

export async function GET() {
  try {
    // 1. Create BUGS table
    await sql`
      CREATE TABLE IF NOT EXISTS bugs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Open',
        priority TEXT DEFAULT 'Medium',
        severity TEXT DEFAULT 'Medium',
        reporter TEXT,
        assignee TEXT DEFAULT 'Unassigned',
        project TEXT DEFAULT 'General',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        activity_log JSONB DEFAULT '[]'::jsonb,
        comments JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `;

    // 2. Create NOTIFICATIONS table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        target_user TEXT NOT NULL,
        actor TEXT,
        bug_id TEXT,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE
      );
    `;

    // 3. Create SETTINGS table
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data JSONB NOT NULL
      );
    `;

    // 4. Initialize Settings if empty
    const settingsCheck = await sql`SELECT * FROM settings WHERE id = 1`;
    if (settingsCheck.rowCount === 0) {
      const defaultSettings = {
        assignees: ["Unassigned", "Rohith", "Tapza Admin", "Engineering Team"],
        statuses: ["Open", "In Progress", "Code Review", "UAT", "Resolved", "Closed", "ReOpen"],
        priorities: ["Critical", "High", "Medium", "Low"],
        projects: ["Pharmacy ERP", "Logistics Suite", "Inventory Pro", "General"],
        severities: ["Blocker", "Critical", "Major", "Minor", "Trivial"]
      };
      await sql`
        INSERT INTO settings (id, data) 
        VALUES (1, ${JSON.stringify(defaultSettings)})
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Database tables initialized successfully. Ready for shared cloud use."
    });
  } catch (error) {
    console.error('Database Init Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
