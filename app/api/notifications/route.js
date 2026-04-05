import { sql } from '@vercel/postgres';
import { NextResponse } from '@/bugTracker/node_modules/next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const user = searchParams.get('user');

        let query;
        if (user) {
            query = await sql`
                SELECT * FROM notifications 
                WHERE target_user = ${user} 
                ORDER BY created_at DESC 
                LIMIT 50
            `;
        } else {
            query = await sql`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100`;
        }

        return NextResponse.json(query.rows);
    } catch (error) {
        console.error("Error loading Postgres notifications", error);
        return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const notif = await request.json();
        const result = await sql`
            INSERT INTO notifications (target_user, actor, bug_id, message) 
            VALUES (${notif.targetUser}, ${notif.actor}, ${notif.bugId}, ${notif.message})
            RETURNING *
        `;
        return NextResponse.json({ success: true, notification: result.rows[0] });
    } catch (error) {
        console.error("Error saving Postgres notification", error);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const { id, allForUser } = await request.json();

        if (allForUser) {
            await sql`
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE target_user = ${allForUser}
            `;
        } else if (id) {
            await sql`
                UPDATE notifications 
                SET is_read = TRUE 
                WHERE id = ${id}
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating Postgres notifications", error);
        return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
    }
}
