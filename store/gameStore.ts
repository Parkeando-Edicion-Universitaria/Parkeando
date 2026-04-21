import { create } from 'zustand';
import { Game, Player, Cell, DiceRoll } from '@/types/game';

interface GameState {
  game: Game | null;
  players: Player[];
  currentPlayer: Player | null;
  cells: Cell[];
  myPlayer: Player | null;
  lastDiceRoll: DiceRoll | null;
  isMyTurn: boolean;

  setGame: (game: Game | null) => void;
  setPlayers: (players: Player[]) => void;
  setCurrentPlayer: (player: Player) => void;
  setCells: (cells: Cell[]) => void;
  setMyPlayer: (player: Player | null) => void;
  setLastDiceRoll: (roll: DiceRoll) => void;
  updatePlayerPosition: (playerId: string, position: number) => void;
  updatePlayerPoints: (playerId: string, points: number) => void;
  updateSinglePlayer: (playerData: Partial<Player> & { id: string }) => void;
  updateGameState: (gameData: Partial<Game>) => void;
  recalculateIsMyTurn: () => void;
  reset: () => void;
}

/** compartido auxiliar: dado a game + jugadores + myPlayer, calcula currentPlayer y isMyTurn */
function computeTurn(game: Game | null, players: Player[], myPlayer: Player | null) {
  if (!game || !myPlayer || players.length === 0) {
    return { currentPlayer: null, isMyTurn: false };
  }
  const currentPlayer = game.current_turn
    ? players.find(p => p.user_id === game.current_turn) ?? players[game.current_player_index || 0]
    : players[game.current_player_index || 0];
  const isMyTurn = currentPlayer ? myPlayer.id === currentPlayer.id : false;
  return { currentPlayer: currentPlayer ?? null, isMyTurn };
}

export const useGameStore = create<GameState>((set, get) => ({
  game: null,
  players: [],
  currentPlayer: null,
  cells: [],
  myPlayer: null,
  lastDiceRoll: null,
  isMyTurn: false,

  /** actualiza game object y inmediatamente recompute isMyTurn from stored jugadores/myPlayer */
  setGame: (game) => {
    const { players, myPlayer } = get();
    const { currentPlayer, isMyTurn } = computeTurn(game, players, myPlayer);
    set({ game, currentPlayer, isMyTurn });
  },

  /** actualiza jugador list y recompute isMyTurn from stored game/myPlayer */
  setPlayers: (players) => {
    const { myPlayer, game } = get();
    const { currentPlayer, isMyTurn } = computeTurn(game, players, myPlayer);
    set({ players, currentPlayer, isMyTurn });
  },

  setCurrentPlayer: (player) => {
    const { myPlayer } = get();
    const isMyTurn = myPlayer ? myPlayer.id === player.id : false;
    set({ currentPlayer: player, isMyTurn });
  },

  setCells: (cells) => set({ cells }),

  /** actualiza myPlayer y recompute isMyTurn from stored game/jugadores */
  setMyPlayer: (player) => {
    const { players, game } = get();
    const { currentPlayer, isMyTurn } = computeTurn(game, players, player);
    set({ myPlayer: player, currentPlayer, isMyTurn });
  },

  setLastDiceRoll: (roll) => set({ lastDiceRoll: roll }),

  updatePlayerPosition: (playerId, position) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, position } : p
      ),
      myPlayer: state.myPlayer?.id === playerId
        ? { ...state.myPlayer, position }
        : state.myPlayer,
    }));
  },

  updatePlayerPoints: (playerId, points) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, points: p.points + points } : p
      ),
      myPlayer: state.myPlayer?.id === playerId
        ? { ...state.myPlayer, points: state.myPlayer.points + points }
        : state.myPlayer,
    }));
  },
  
  updateSinglePlayer: (playerData) => {
    const { players, myPlayer, game } = get();
    const updatedPlayers = players.map(p => 
      p.id === playerData.id ? { ...p, ...playerData } : p
    );
    const updatedMyPlayer = myPlayer?.id === playerData.id 
      ? { ...myPlayer, ...playerData } 
      : myPlayer;
    
    const { currentPlayer, isMyTurn } = computeTurn(game, updatedPlayers, updatedMyPlayer);
    set({ players: updatedPlayers, myPlayer: updatedMyPlayer, currentPlayer, isMyTurn });
  },

  updateGameState: (gameData) => {
    const { game, players, myPlayer } = get();
    if (!game) return;
    const updatedGame = { ...game, ...gameData };
    const { currentPlayer, isMyTurn } = computeTurn(updatedGame, players, myPlayer);
    set({ game: updatedGame, currentPlayer, isMyTurn });
  },

  /** llamar después recibir a tiempo real actualiza cuando you want an immediate isMyTurn refresco */
  recalculateIsMyTurn: () => {
    const { game, players, myPlayer } = get();
    const { currentPlayer, isMyTurn } = computeTurn(game, players, myPlayer);
    set({ currentPlayer, isMyTurn });
  },

  reset: () => set({
    game: null,
    players: [],
    currentPlayer: null,
    cells: [],
    myPlayer: null,
    lastDiceRoll: null,
    isMyTurn: false,
  }),
}));
