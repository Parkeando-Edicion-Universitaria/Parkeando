import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { SHOP_ITEMS } from '../route';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const { itemId, action } = await req.json();
        const db = getServiceSupabase();

        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return NextResponse.json({ error: 'Artículo no encontrado en la tienda' }, { status: 404 });

        const { data: userRaw, error: userErr } = await db.from('users').select('inventory, equipped').eq('id', req.user!.userId).single();
        if (userErr || !userRaw) throw new Error("Usuario no encontrado");

        if (action !== 'unequip' && (!userRaw.inventory || !userRaw.inventory.includes(itemId))) {
            return NextResponse.json({ error: 'No posees este artículo en tu inventario' }, { status: 403 });
        }

        const currentEquipped = userRaw.equipped || { avatar: null, border: null, title: null };

        if (action === 'unequip') {
            currentEquipped[item.type as keyof typeof currentEquipped] = null;
        } else {
            currentEquipped[item.type as keyof typeof currentEquipped] = itemId;
        }

        const { error: updateErr } = await db
            .from('users')
            .update({ equipped: currentEquipped })
            .eq('id', req.user!.userId);

        if (updateErr) throw updateErr;

        // Actualizar el "icon" en tiempo real si está en una partida.
        // Ahora guardamos TODO el JSON de currentEquipped en la columna icon
        await db.from('game_players').update({ 
            icon: JSON.stringify(currentEquipped)
        }).eq('user_id', req.user!.userId);

        return NextResponse.json({ success: true, message: `Perfil actualizado exitosamente` });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});
