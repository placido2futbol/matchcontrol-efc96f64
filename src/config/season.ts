// Centralised season configuration.
// Changing CURRENT_SEASON here switches the whole app to the new season;
// previous seasons stay available read-only from the history views.

export interface SeasonConfig {
  /** Label stored in the database (matches public.seasons.label) */
  label: string;
  /** Short label used in FCF legacy URLs, e.g. 2627 */
  fcfUrlSeason: string;
  /** Internal FCF API season id (public.seasons.fcf_season_id) */
  fcfSeasonId: number;
  archived: boolean;
}

export const SEASONS: SeasonConfig[] = [
  { label: '2026/27', fcfUrlSeason: '2627', fcfSeasonId: 22, archived: false },
  { label: '2025/26', fcfUrlSeason: '2526', fcfSeasonId: 21, archived: true },
];

export const CURRENT_SEASON = '2026/27';

export const ARCHIVED_SEASONS = SEASONS.filter(s => s.archived).map(s => s.label);

export const SEASON_LABELS = SEASONS.map(s => s.label);

export function getSeasonConfig(label: string): SeasonConfig | undefined {
  return SEASONS.find(s => s.label === label);
}

export function isCurrentSeason(label?: string | null) {
  return (label || CURRENT_SEASON) === CURRENT_SEASON;
}

/** Message shown when the federation has not published the calendar yet. */
export const CALENDAR_PENDING_MESSAGE =
  'Calendari pendent de publicació per la FCF. Podràs autoemplenar el partit quan la federació publiqui la competició.';
