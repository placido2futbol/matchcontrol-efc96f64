import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCallupManager } from '@/hooks/useCallupManager';
import { useSquadManager } from '@/hooks/useSquadManager';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import CallupList from '@/components/callups/CallupList';
import CallupPitch from '@/components/callups/CallupPitch';
import CallupMatchTab from '@/components/callups/CallupMatchTab';
import CallupPlayerPanel from '@/components/callups/CallupPlayerPanel';
import CallupListTab from '@/components/callups/CallupListTab';
import CallupExportTab from '@/components/callups/CallupExportTab';
import { FORMATIONS, type EditorTab } from '@/components/callups/types';

export default function Callups() {
  const navigate = useNavigate();
  const { textClass, btnClass } = useTheme();
  const isMobile = useIsMobile();

  const cm = useCallupManager();
  const sm = useSquadManager(cm.players, cm.setPlayers);

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [activeTab, setActiveTab] = useState<EditorTab>('players');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [whatsappFooter, setWhatsappFooter] = useState('');

  const pitchRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const handleNewCallup = () => {
    cm.resetForm();
    sm.setPitchSlots(new Array(11).fill(null));
    sm.setFormation('4-3-3');
    setActiveTab('players');
    setView('editor');
  };

  const handleEditCallup = (c: typeof cm.callups[0]) => {
    const calPlayers = cm.loadCallup(c);
    sm.initSlotsFromPlayers(calPlayers);
    sm.setFormation('4-3-3');
    setActiveTab('players');
    setView('editor');
  };

  const handleTeamChange = (teamId: string) => {
    cm.setSelectedTeamId(teamId);
    if (!cm.editId) {
      cm.loadTeamPlayers(teamId);
      sm.setPitchSlots(new Array(11).fill(null));
    }
  };

  const handleSave = () => cm.saveCallup(sm.pitchSlots);

  const handleDelete = async () => {
    if (!deleteId) return;
    await cm.deleteCallup(deleteId);
    setDeleteId(null);
    if (view === 'editor') setView('list');
  };

  const team = cm.teams.find(t => t.id === cm.selectedTeamId);

  // ── LIST VIEW ──
  if (view === 'list') {
    return (
      <CallupList
        callups={cm.callups}
        loading={cm.loading}
        teams={cm.teams}
        textClass={textClass}
        btnClass={btnClass}
        onBack={() => navigate('/')}
        onNew={handleNewCallup}
        onEdit={handleEditCallup}
        onDelete={(id) => cm.deleteCallup(id)}
      />
    );
  }

  // ── EDITOR TABS ──
  const tabs: { key: EditorTab; icon: string; label: string }[] = [
    { key: 'match', icon: '⚽', label: 'Partido' },
    { key: 'players', icon: '👥', label: 'Jugadores' },
    { key: 'list', icon: '📋', label: 'Lista' },
    { key: 'export', icon: '📤', label: 'Exportar' },
  ];

  const renderPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Team selector */}
      <div className="px-3 py-2 border-b shrink-0">
        <Select value={cm.selectedTeamId} onValueChange={handleTeamChange}>
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue placeholder="▼ Selecciona equipo" />
          </SelectTrigger>
          <SelectContent>
            {cm.teams.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex items-center gap-2">
                  {t.crest_url && <img src={t.crest_url} alt="" className="h-4 w-4 object-contain" />}
                  <span className="text-xs">{t.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              activeTab === tab.key
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'match' && (
          <CallupMatchTab
            opponent={cm.opponent} setOpponent={cm.setOpponent}
            matchDate={cm.matchDate} setMatchDate={cm.setMatchDate}
            matchTime={cm.matchTime} setMatchTime={cm.setMatchTime}
            callupTime={cm.callupTime} setCallupTime={cm.setCallupTime}
            callupLocation={cm.callupLocation} setCallupLocation={cm.setCallupLocation}
            notes={cm.notes} setNotes={cm.setNotes}
            autofillLoading={cm.autofillLoading}
            onAutofill={cm.autofillFromFCF}
            hasTeam={!!cm.selectedTeamId}
          />
        )}

        {activeTab === 'players' && (
          <CallupPlayerPanel
            substitutePlayers={sm.substitutePlayers}
            desconvocados={sm.desconvocados}
            selectedSlot={sm.selectedSlot}
            onAssignToSlot={sm.assignToSlot}
            onToggleSubstitute={sm.toggleSubstitute}
            onRemoveFromList={sm.removeFromList}
            onPanelDragStart={sm.handlePanelDragStart}
            onPanelDragMove={sm.handlePanelDragMove}
            onPanelDragEnd={(e) => sm.handlePanelDragEnd(e, pitchRef)}
            panelDragStarted={sm.panelDragStarted}
            onResetPanelDrag={sm.resetPanelDrag}
            onImportExcel={cm.importFromExcel}
          />
        )}

        {activeTab === 'list' && (
          <CallupListTab
            starters={sm.starters}
            substitutePlayers={sm.substitutePlayers}
          />
        )}

        {activeTab === 'export' && (
          <CallupExportTab
            team={team}
            opponent={cm.opponent}
            matchDate={cm.matchDate}
            matchTime={cm.matchTime}
            callupTime={cm.callupTime}
            callupLocation={cm.callupLocation}
            starters={sm.starters}
            substitutePlayers={sm.substitutePlayers}
            whatsappFooter={whatsappFooter}
            setWhatsappFooter={setWhatsappFooter}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-2 sm:px-3 py-2 border-b bg-card shrink-0">
        {team?.crest_url && <img src={team.crest_url} alt="" className="h-6 w-6 sm:h-7 sm:w-7 object-contain" />}
        <Select value={sm.formation} onValueChange={sm.setFormation}>
          <SelectTrigger className="w-[70px] sm:w-20 h-7 text-[10px] sm:text-xs font-semibold"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(FORMATIONS).map(f => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide truncate">{team?.name || 'Equipo'}</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewCallup}><Plus className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}><Save className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cm.editId && setDeleteId(cm.editId)}><Trash2 className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView('list')}><ArrowLeft className="h-4 w-4" /></Button>
      </div>

      {/* Main content */}
      {isMobile ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 p-2" style={{ height: '55%' }}>
            <CallupPitch
              pitchSlots={sm.pitchSlots}
              players={cm.players}
              formationPositions={sm.formationPositions}
              getSlotPosition={sm.getSlotPosition}
              selectedSlot={sm.selectedSlot}
              setSelectedSlot={sm.setSelectedSlot}
              dragOffset={sm.dragOffset}
              draggingSlot={sm.draggingSlot}
              onTokenPointerDown={sm.handleTokenPointerDown}
              onTokenPointerMove={sm.handleTokenPointerMove}
              onTokenPointerUp={sm.handleTokenPointerUp}
              pitchRef={pitchRef}
            />
          </div>
          <div className="flex-1 border-t overflow-hidden bg-card">
            {renderPanel()}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-3 min-w-0">
            <div className="w-full max-w-lg" style={{ aspectRatio: '3/4' }}>
              <CallupPitch
                pitchSlots={sm.pitchSlots}
                players={cm.players}
                formationPositions={sm.formationPositions}
                getSlotPosition={sm.getSlotPosition}
                selectedSlot={sm.selectedSlot}
                setSelectedSlot={sm.setSelectedSlot}
                dragOffset={sm.dragOffset}
                draggingSlot={sm.draggingSlot}
                onTokenPointerDown={sm.handleTokenPointerDown}
                onTokenPointerMove={sm.handleTokenPointerMove}
                onTokenPointerUp={sm.handleTokenPointerUp}
                pitchRef={pitchRef}
              />
            </div>
          </div>
          <div className="w-80 lg:w-96 border-l bg-card flex flex-col shrink-0 overflow-hidden">
            {renderPanel()}
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar convocatoria?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating drag ghost */}
      {sm.panelDragPlayer !== null && sm.panelDragPos && sm.panelDragStarted.current && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{ left: sm.panelDragPos.x, top: sm.panelDragPos.y, transform: 'translate(-50%, -50%)' }}
        >
          <div
            className="rounded-full border-2 border-primary-foreground shadow-2xl flex items-center justify-center text-primary-foreground font-black"
            style={{
              width: 44, height: 44,
              background: 'linear-gradient(160deg, hsl(var(--accent)) 0%, hsl(var(--destructive)) 45%, hsl(var(--accent)) 100%)',
              fontSize: 17,
            }}
          >
            {cm.players[sm.panelDragPlayer]?.dorsal || '?'}
          </div>
          <div className="text-primary-foreground text-[9px] font-bold text-center mt-0.5 drop-shadow-lg uppercase">
            {cm.players[sm.panelDragPlayer]?.player_name.split(' ').pop()}
          </div>
        </div>
      )}
    </div>
  );
}
