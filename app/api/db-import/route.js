import { sql } from '@vercel/postgres';
import { NextResponse } from '@/bugTracker/node_modules/next/server';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    const dbDir = path.join(process.cwd(), 'database');
    const settingsPath = path.join(process.cwd(), 'settings.json');
    const notifsPath = path.join(dbDir, 'notifications.json');

    const report = {
      bugs: 0,
      settings: false,
      notifications: 0
    };

    // 1. Import Settings
    if (fs.existsSync(settingsPath)) {
      const settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      await sql`
        INSERT INTO settings (id, data) 
        VALUES (1, ${JSON.stringify(settingsData)})
        ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(settingsData)}
      `;
      report.settings = true;
    }

    // 2. Import Notifications
    if (fs.existsSync(notifsPath)) {
      const notifsData = JSON.parse(fs.readFileSync(notifsPath, 'utf8'));
      for (const n of notifsData) {
        await sql`
          INSERT INTO notifications (target_user, actor, bug_id, message, created_at, is_read) 
          VALUES (${n.targetUser}, ${n.actor}, ${n.bugId}, ${n.message}, ${n.date || new Date().toISOString()}, ${n.isRead || false})
        `;
        report.notifications++;
      }
    }

    // 3. Import Bugs (Excel Shards)
    if (fs.existsSync(dbDir)) {
      const shardFiles = fs.readdirSync(dbDir)
        .filter(f => f.startsWith('bugs_') && f.endsWith('.xlsx'));

      for (const file of shardFiles) {
        const filePath = path.join(dbDir, file);
        const buf = fs.readFileSync(filePath);
        const workbook = xlsx.read(buf, { type: 'buffer' });
        const sheet = workbook.Sheets['Bugs'];
        if (sheet) {
          const bugs = xlsx.utils.sheet_to_json(sheet);
          for (const bug of bugs) {
            // Ensure ID is text
            const bid = String(bug.id);
            const createdAt = bug.createdAt || new Date().toISOString();
            const updatedAt = bug.updatedAt || createdAt;

            // Clean up JSON fields for Postgres insert
            let activityLog = bug.activityLog;
            if (typeof activityLog === 'string') {
              try { activityLog = JSON.parse(activityLog); } catch (e) { activityLog = []; }
            }
            let comments = bug.comments;
            if (typeof comments === 'string') {
              try { comments = JSON.parse(comments); } catch (e) { comments = []; }
            }

            await sql`
              INSERT INTO bugs (
                id, title, description, status, priority, severity, 
                reporter, assignee, project, created_at, updated_at, 
                activity_log, comments
              ) VALUES (
                ${bid}, ${bug.title || 'Untitled'}, ${bug.description || ''}, 
                ${bug.status || 'Open'}, ${bug.priority || 'Medium'}, ${bug.severity || 'Medium'}, 
                ${bug.reporter || 'System'}, ${bug.assignee || 'Unassigned'}, 
                ${bug.project || 'General'}, ${createdAt}, ${updatedAt}, 
                ${JSON.stringify(activityLog || [])}, ${JSON.stringify(comments || [])}
              ) ON CONFLICT (id) DO NOTHING
            `;
            report.bugs++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data migration from Local Excel/JSON to Vercel Postgres complete.",
      report
    });
  } catch (error) {
    console.error('Migration Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
