import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { withAuth } from '@/lib/auth-middleware';

const handler = async () => {
    try {
        const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '010_user_inventory.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
        const sqlClient = postgres(process.env.DATABASE_URL, { ssl: 'require' });

        await sqlClient.unsafe(sql);
        await sqlClient.end();

        return NextResponse.json({ success: true, message: 'Migration executed via Postgres Driver.' });
    } catch (e: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
};

const protectedGet = withAuth(handler, { requireSuperAdmin: true });

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return protectedGet(req, { params: Promise.resolve({}) });
}
