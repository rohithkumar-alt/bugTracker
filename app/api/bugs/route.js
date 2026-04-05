import { sql } from '@vercel/postgres';
import { NextResponse } from '@/bugTracker/node_modules/next/server';

// Helper to log changes (same logic as before)
function getChangeLogs(oldBug, newBug) {
  const logs = [];
  const timestamp = new Date().toISOString();
  const actor = newBug.updatedBy || newBug.reporter || 'System';

  const fieldsToTrack = [
    { key: 'status', label: 'Status' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'priority', label: 'Priority' },
    { key: 'severity', label: 'Severity' },
    { key: 'project', label: 'Project' },
    { key: 'title', label: 'Title' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'curl', label: 'CURL Command', isTechnical: true },
    { key: 'githubPr', label: 'GitHub PR' }
  ];

  fieldsToTrack.forEach(field => {
    const oldValue = oldBug[field.key];
    const newValue = newBug[field.key];

    if (oldValue !== newValue) {
      const logEntry = {
        date: timestamp,
        action: `${field.label} updated by ${actor}`
      };

      if (field.isTechnical) {
        logEntry.type = 'curl';
        logEntry.details = newValue;
      } else {
        logEntry.fieldKey = field.key;
        logEntry.from = oldValue || '—';
        logEntry.to = newValue || '—';
      }
      logs.push(logEntry);
    }
  });

  const textFields = [
    { key: 'description', label: 'Description' },
    { key: 'stepsToReproduce', label: 'Steps to Reproduce' },
    { key: 'expectedResult', label: 'Expected Result' },
    { key: 'actualResult', label: 'Actual Result' }
  ];

  textFields.forEach(field => {
    if (oldBug[field.key] !== newBug[field.key]) {
      logs.push({
        date: timestamp,
        action: `${field.label} updated by ${actor}`,
        fieldKey: field.key,
        from: oldBug[field.key] || '—',
        to: newBug[field.key] || '—'
      });
    }
  });

  return logs;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM bugs ORDER BY created_at DESC`;
    // Transform column names back to match UI camelCase requirements if needed
    // The current UI uses: id, title, status, priority, severity, reporter, assignee, project, createdAt, updatedAt, activityLog, comments
    const transformedBugs = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      severity: row.severity,
      reporter: row.reporter,
      assignee: row.assignee,
      project: row.project,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      activityLog: JSON.stringify(row.activity_log || []),
      comments: JSON.stringify(row.comments || []),
      metadata: row.metadata || {}
    }));
    return NextResponse.json({ success: true, bugs: transformedBugs });
  } catch (error) {
    console.error("Error loading Postgres bugs", error);
    return NextResponse.json({ error: "Failed to load database" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const newBug = await request.json();

    // Generate ID (BUG-N format) within a transaction logic
    const { rows: maxRows } = await sql`SELECT MAX(id) as max_id FROM bugs`;
    let nextIdNum = 1;
    if (maxRows[0].max_id) {
      const match = maxRows[0].max_id.match(/(\d+)$/);
      if (match) nextIdNum = parseInt(match[1]) + 1;
    }
    const bugId = `BUG-${nextIdNum}`;

    const timestamp = new Date().toISOString();
    const initialLog = [{
      date: timestamp,
      action: `Bug reported by ${newBug.reporter || 'Not Assigned'}`
    }];

    const result = await sql`
      INSERT INTO bugs (
        id, title, description, status, priority, severity, 
        reporter, assignee, project, created_at, updated_at, 
        activity_log, comments
      ) VALUES (
        ${bugId}, ${newBug.title}, ${newBug.description}, ${newBug.status || 'Open'}, 
        ${newBug.priority || 'Medium'}, ${newBug.severity || 'Medium'}, 
        ${newBug.reporter || 'System'}, ${newBug.assignee || 'Unassigned'}, 
        ${newBug.project || 'General'}, ${timestamp}, ${timestamp}, 
        ${JSON.stringify(initialLog)}, ${JSON.stringify([])}
      ) RETURNING *
    `;

    return NextResponse.json({ success: true, bug: result.rows[0] });
  } catch (error) {
    console.error("Error creating Postgres bug", error);
    return NextResponse.json({ error: "Failed to create bug" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const updatedBug = await request.json();

    // 1. Fetch current bug state
    const { rows } = await sql`SELECT * FROM bugs WHERE id = ${updatedBug.id}`;
    if (rows.length === 0) return NextResponse.json({ error: "Bug not found" }, { status: 404 });

    const oldBug = rows[0];
    // Map DB underscore to JSON camelCase for internal log comparison
    const oldBugMapped = {
      ...oldBug,
      activityLog: oldBug.activity_log,
      comments: oldBug.comments
    };

    // 2. Generate Change Logs
    let logs = Array.isArray(oldBug.activity_log) ? oldBug.activity_log : [];
    const newLogs = getChangeLogs(oldBugMapped, updatedBug);
    const finalLogs = [...logs, ...newLogs];

    // 3. Update in DB
    const timestamp = new Date().toISOString();
    await sql`
      UPDATE bugs SET
        title = ${updatedBug.title},
        description = ${updatedBug.description},
        status = ${updatedBug.status},
        priority = ${updatedBug.priority},
        severity = ${updatedBug.severity},
        assignee = ${updatedBug.assignee},
        project = ${updatedBug.project},
        updated_at = ${timestamp},
        activity_log = ${JSON.stringify(finalLogs)},
        comments = ${typeof updatedBug.comments === 'string' ? updatedBug.comments : JSON.stringify(updatedBug.comments || [])}
      WHERE id = ${updatedBug.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating Postgres bug", error);
    return NextResponse.json({ error: "Failed to update bug" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id, ids } = await request.json();
    const targetIds = Array.isArray(ids) ? ids : (id ? [id] : []);

    if (targetIds.length === 0) return NextResponse.json({ error: "No IDs provided" }, { status: 400 });

    const result = await sql`DELETE FROM bugs WHERE id = ANY(${targetIds})`;
    return NextResponse.json({ success: true, deletedCount: result.rowCount });
  } catch (error) {
    console.error("Error deleting Postgres bugs", error);
    return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 });
  }
}
