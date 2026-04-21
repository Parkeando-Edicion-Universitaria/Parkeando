import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { PANAMA_ICON_COLLECTION } from '@/lib/panama-icons';

type ShopItem = {
    id: string;
    name: string;
    type: 'avatar' | 'border' | 'title';
    price: number;
    icon: string;
    description: string;
};

const BASE_SHOP_ITEMS: ShopItem[] = [
    { id: 'avatar_gold', name: 'Marco Dorado', type: 'border', price: 25, icon: '🌟', description: 'Un marco de perfil brillante exclusivo para campeones.' },
    { id: 'avatar_neon', name: 'Marco Neón', type: 'border', price: 15, icon: '🟣', description: 'Vibra con estilo urbano nocturno.' },
    { id: 'title_boss', name: 'Título: El/La Jefe/a', type: 'title', price: 50, icon: '👑', description: 'Muestra quién manda en la sala de chat.' },
    { id: 'title_rookie', name: 'Título: Novato Peligroso', type: 'title', price: 8, icon: '🔥', description: 'Recién llegado pero con ganas de ganar.' },
    { id: 'emoji_alien', name: 'Avatar: Alienígena', type: 'avatar', price: 38, icon: '👽', description: 'Reemplaza tu coche con un OVNI.' },
    { id: 'emoji_ghost', name: 'Avatar: Fantasma', type: 'avatar', price: 38, icon: '👻', description: 'Flota por el tablero silenciosamente.' },
];

const PANAMA_AVATAR_SHOP_ITEMS: ShopItem[] = PANAMA_ICON_COLLECTION.map((item) => ({
    id: item.id,
    name: item.name,
    type: 'avatar',
    price: item.price,
    icon: item.imagePath,
    description: item.description,
}));

// Catálogo estático de tienda
export const SHOP_ITEMS: ShopItem[] = [
    ...BASE_SHOP_ITEMS,
    ...PANAMA_AVATAR_SHOP_ITEMS,
];

export const GET = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const db = getServiceSupabase();

        // Usar la misma fuente que leaderboard/scoreboard: users.total_points
        const { data: userRaw } = await db
            .from('users')
            .select('id, inventory, spent_points, equipped, total_points')
            .eq('id', req.user!.userId)
            .single();

        const totalEarned = userRaw?.total_points || 0;

        const balance = Math.max(0, totalEarned - (userRaw?.spent_points || 0));

        return NextResponse.json({
            catalog: SHOP_ITEMS,
            inventory: userRaw?.inventory || [],
            equipped: userRaw?.equipped || { avatar: null, border: null, title: null },
            balance: balance,
            spent_points: userRaw?.spent_points || 0,
            total_earned: totalEarned
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const { itemId } = await req.json();
        const db = getServiceSupabase();

        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });

        // Obtener datos del usuario
        const { data: userRaw, error: userErr } = await db
            .from('users')
            .select('inventory, spent_points, total_points')
            .eq('id', req.user!.userId)
            .single();

        if (userErr || !userRaw) throw new Error("Usuario no encontrado");

        // Verificar si ya está comprado
        const inventory = userRaw.inventory || [];
        if (inventory.includes(itemId)) {
            return NextResponse.json({ error: 'Ya posees este artículo' }, { status: 400 });
        }

        // Saldo alineado con los puntos del leaderboard
        const currentBalance = (userRaw.total_points || 0) - (userRaw.spent_points || 0);

        if (currentBalance < item.price) {
            return NextResponse.json({ error: 'Balboa insuficiente' }, { status: 400 });
        }

        // Actualizar usuario: agregar al inventario y descontar puntos (sumar a spent)
        const newInventory = [...inventory, itemId];
        const newSpent = (userRaw.spent_points || 0) + item.price;

        const { error: updateErr } = await db
            .from('users')
            .update({
                inventory: newInventory,
                spent_points: newSpent
            })
            .eq('id', req.user!.userId);

        if (updateErr) throw updateErr;

        return NextResponse.json({
            success: true,
            message: `¡Has comprado ${item.name}!`,
            item
        });

    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});
