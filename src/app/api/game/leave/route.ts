import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let user = getUserFromRequest(req);

    // respaldo para sendBeacon (que no manda headers fácilmente)
    if (!user && body.accessToken) {
      const { verifyAccessToken } = await import("@/lib/jwt");
      user = verifyAccessToken(body.accessToken);
    }

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { gameId } = body;
    if (!gameId) {
      return NextResponse.json(
        { error: "ID de partida requerido" },
        { status: 400 },
      );
    }

      const supabase = getServiceSupabase();
      const { data: leavingUser } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.userId)
        .maybeSingle();

    // Validar el estado del juego, no pueden salirse de uno 'in_progress' ni 'finished' (solo 'waiting')
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select(`id, status`)
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: "Juego no encontrado" },
        { status: 404 },
      );
    }

    if (game.status === "finished") {
      return NextResponse.json(
        { error: "La partida ya ha finalizado" },
        { status: 400 },
      );
    }

    if (game.status === "in_progress") {
      // El jugador está abandonando una partida activa
      // 1. Marcarlo como inactivo
      const { error: updateError } = await supabase
        .from("game_players")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("game_id", gameId)
        .eq("user_id", user.userId);

      if (updateError) {
        console.error("[API Leave Game] Update error:", updateError);
        return NextResponse.json(
          { error: "Error al abandonar partida en curso" },
          { status: 500 },
        );
      }

      // 2. Registrar el evento de abandono
      await supabase.from("game_events").insert({
        game_id: gameId,
        player_id: user.userId, // Usa el userId si no hay jugador.id disponible, usualmente el client maneja el event lookup
        event_type: "player_left",
        event_data: {
          userId: user.userId,
          username: leavingUser?.username ?? null,
          message: `${leavingUser?.username ?? 'Un jugador'} abandonó la partida.`,
        },
      });

      // 3. Forzar el pase de turno por si era su turno
      const { nextTurn } = await import("@/lib/game-manager");
      await nextTurn(gameId, {
        reason: "player_left",
        expectedCurrentTurn: user.userId,
        removedPlayer: {
          userId: user.userId,
          username: leavingUser?.username ?? null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Has abandonado la partida en curso.",
      });
    }

    if (game.status === "waiting") {
      // Borrar de game_players
      const { error: deleteError } = await supabase
        .from("game_players")
        .delete()
        .eq("game_id", gameId)
        .eq("user_id", user.userId);

      if (deleteError) {
        console.error("[API Leave Game] Delete error:", deleteError);
        return NextResponse.json(
          { error: "Error interno de DB al salir de la partida" },
          { status: 500 },
        );
      }

      // Limpiar su estado de 'listo' en el objeto JSONB 'queue'
      const { data: gameData } = await supabase
        .from("games")
        .select("queue")
        .eq("id", gameId)
        .single();

      if (gameData) {
        let queue = gameData.queue || {};
        if (queue[user.userId]) {
          delete queue[user.userId];

          delete queue._startCountdownAt;

          // Si alguien sale, cancelamos la cuenta regresiva si estaba activa
          await supabase
            .from("games")
            .update({
              queue,
            })
            .eq("id", gameId);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Saliste de la partida exitosamente.",
      });
    }

    return NextResponse.json(
      { error: "Estado de partida inválido" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[API Leave Game] Error:", err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
