import React, { useEffect, useState } from 'react';
import { RoomSummary } from '../types/multiplayer';
import { Check, Copy, Globe, Plus, Sparkles, Swords, Users, X } from 'lucide-react';

interface MultiplayerLobbyModalProps {
  playerName: string;
  currentRoomCode: string;
  onUpdatePlayerName: (name: string) => void;
  onJoinMultiplayer: (roomCode: string, mode: 'rpg' | 'arena') => void;
  onClose: () => void;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  playerName,
  currentRoomCode,
  onUpdatePlayerName,
  onJoinMultiplayer,
  onClose
}) => {
  const [roomInput, setRoomInput] = useState<string>(currentRoomCode || 'PUBLIC');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const loadRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (!res.ok) return;
        const data = (await res.json()) as { rooms?: RoomSummary[] };
        if (active && Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
      } catch {
        // ignore transient errors
      }
    };
    loadRooms();
    const id = window.setInterval(loadRooms, 4000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const sanitizedRoom =
    roomInput
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 16) || 'PUBLIC';

  const handleGenerateFriendRoom = () => {
    const words = ['DRAGON', 'STAR', 'EMBER', 'FROST', 'WOLF', 'AEGIS'];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = 10 + Math.floor(Math.random() * 89);
    setRoomInput(`${word}-${num}`);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(sanitizedRoom).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg font-bold text-slate-100">Multiplayer & Co-op Rooms</h2>
              <p className="text-xs text-slate-400">
                Explore with friends, chat live, and conquer harder obstacle minigames together!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Hero Name */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <label htmlFor="mp-hero-name" className="text-xs font-semibold text-slate-300 shrink-0">
              Your Display Name:
            </label>
            <input
              id="mp-hero-name"
              type="text"
              value={playerName}
              onChange={(e) => onUpdatePlayerName(e.target.value)}
              maxLength={20}
              placeholder="Enter hero name..."
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-sky-400 focus:outline-none rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-100"
            />
          </div>

          {/* Room Code Picker */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">Friend Room Code</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRoomInput('PUBLIC')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <Globe className="w-3 h-3" />
                  <span>Public Plaza</span>
                </button>
                <button
                  onClick={handleGenerateFriendRoom}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-[11px] font-semibold text-purple-200 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Friend Code</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                maxLength={16}
                placeholder="PUBLIC or DRAGON-42"
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-sky-400 focus:outline-none rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-amber-300 tracking-wider"
              />
              <button
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                title="Copy Room Code to share with friends"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Share <strong className="text-amber-300 font-mono">{sanitizedRoom}</strong> with friends (or open another browser tab) to meet in the same world and play co-op!
            </p>
          </div>

          {/* Active Live Rooms */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
              Active Rooms Right Now
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5">
              {rooms.map((r) => (
                <button
                  key={r.roomCode}
                  onClick={() => setRoomInput(r.roomCode)}
                  className={`w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    sanitizedRoom === r.roomCode
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-amber-300">{r.roomCode}</span>
                    {r.players.length > 0 && (
                      <span className="text-[11px] text-slate-400 truncate">
                        ({r.players.map((p) => p.name).join(', ')})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.activeSessions > 0 && (
                      <span className="text-[10px] font-bold text-emerald-300">
                        {r.activeSessions} Co-op Active
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-sky-300">
                      {r.playerCount} Online
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Launch Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => onJoinMultiplayer(sanitizedRoom, 'rpg')}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-cinzel font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Join Roleplay World (Co-op)</span>
            </button>
            <button
              onClick={() => onJoinMultiplayer(sanitizedRoom, 'arena')}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-cinzel font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              <span>Join Battle Arena + Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
