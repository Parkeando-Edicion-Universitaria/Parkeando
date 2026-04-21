import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';

const handler = async () => {
    try {
        const supabase = getServiceSupabase();

        console.log('--- Iniciando migración vía API ---');

        // 1. Agregar columnas
        const { error: colError } = await supabase.rpc('execute_sql', {
            sql_query: `
        ALTER TABLE game_players 
        ADD COLUMN IF NOT EXISTS pending_position INTEGER,
        ADD COLUMN IF NOT EXISTS pending_dice INTEGER;
      `
        });

        // Si RPC no existe, usaremos una alternativa o informaremos
        if (colError) {
            console.log('RPC execute_sql falló (normal si no está definido). Intentando vía alternativa...');
            return NextResponse.json({
                error: 'No se pudo ejecutar DDL directamente. Por favor ejecute el siguiente SQL en el dashboard de Supabase:',
                sql: `
          ALTER TABLE game_players 
          ADD COLUMN IF NOT EXISTS pending_position INTEGER,
          ADD COLUMN IF NOT EXISTS pending_dice INTEGER;
          
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
              CREATE PUBLICATION supabase_realtime;
            END IF;
          END $$;
          
          ALTER PUBLICATION supabase_realtime ADD TABLE games;
          ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
        `
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Migración completada (teóricamente)' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

  const protectedGet = withAuth(handler, { requireSuperAdmin: true });

  export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return protectedGet(req, { params: Promise.resolve({}) });
  }
