export const LINEUP_VOICES = [
  { id: 'Fenrir', label: 'Chico · enérgico' },
  { id: 'Charon', label: 'Chico · profundo' },
  { id: 'Kore', label: 'Chica · potente' },
  { id: 'Aoede', label: 'Chica · cálida' },
] as const;

export const LINEUP_STYLES = [
  { id: 'stadium', label: 'Estadio', instruction: "Molt enèrgic i emocionant, amb entonació d'estadi, allargant els noms amb passió." },
  { id: 'natural', label: 'Natural', instruction: 'To proper, càlid i natural. Ritme tranquil, sense cridar ni allargar artificialment les paraules.' },
  { id: 'radio', label: 'Radio deportiva', instruction: 'To de periodista esportiu professional, dinàmic, clar i alegre, sense cridar ni allargar les paraules.' },
] as const;

export function resolveLineupVoice(voice: unknown, style: unknown) {
  return {
    voice: LINEUP_VOICES.find(v => v.id === voice) ?? LINEUP_VOICES[0],
    style: LINEUP_STYLES.find(s => s.id === style) ?? LINEUP_STYLES[0],
  };
}