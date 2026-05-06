interface PlayerLike {
  player_name: string;
  dorsal: string;
}

interface Props {
  starters: PlayerLike[];
  substitutePlayers: PlayerLike[];
}

export default function CallupListTab({ starters, substitutePlayers }: Props) {
  const allCalled = [...starters, ...substitutePlayers]
    .sort((a, b) => (parseInt(a.dorsal) || 999) - (parseInt(b.dorsal) || 999));

  if (allCalled.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No hay jugadores convocados todavía
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        CONVOCADOS ({allCalled.length})
      </h3>
      <div className="divide-y divide-border rounded-lg border overflow-hidden">
        {allCalled.map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-card">
            <span className="text-sm font-black w-8 text-center text-primary">{p.dorsal || '—'}</span>
            <span className="text-xs font-semibold uppercase flex-1 truncate">{p.player_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
