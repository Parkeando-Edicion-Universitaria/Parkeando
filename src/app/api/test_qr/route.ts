import { NextResponse } from 'next/server';
import { parseQRCode, validateQRCode } from '@/lib/qr-validator';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { qr } = await req.json();
    const parsed = parseQRCode(qr);
    if (!parsed) return NextResponse.json({ error: 'No parsea' });
    const validated = validateQRCode(qr);
    
    return NextResponse.json({
        received_qr: qr,
        parsed_hash: parsed.hash,
        is_valid: validated?.isValid === true,
        cell_number: parsed.cellNumber,
        has_question: parsed.hasQuestion,
    });
}, { requireSuperAdmin: true });
