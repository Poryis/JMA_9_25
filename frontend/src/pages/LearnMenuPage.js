import SubMenuPage from '../components/SubMenuPage';

const LEARN_TILES = [
  {
    id: 'lessons',
    title: 'MUSIC 101',
    path: '/lessons',
    bg: 'assets/backgrounds/curtain-bg.png',
    color: '#7A1F1F',
    accent: '#4A0E0E',
    character: 'assets/backgrounds/charlie-lecturn.png',
    charWidthPct: 30,
    charObjectPosition: 'bottom right',
    decoration: 'spotlight',
    sfx: 'assets/audio/sfx-page.mp3',
    fullWidth: true,
  },
  {
    id: 'fun-facts',
    title: 'FUN FACTS CLUBHOUSE',
    path: '/fun-facts',
    bg: 'assets/backgrounds/clubhouse.png',
    color: '#FFCC00',
    accent: '#F39C12',
    character: 'assets/characters/charlie-polliwog.png',
    charWidthPct: 28,
    decoration: 'clouds',
    sfx: 'assets/audio/sfx-twinkle.mp3',
  },
  {
    id: 'boom-garden',
    // Renamed from "Stew's Rhythm Academy" — this is now the primary
    // "Who's Got the Rhythm" home. The falling-notes game (previously
    // called "Who's Got the Rhythm?") is now "Jelly Jukebox" under Play.
    // Theme: marching band on a football field.
    title: "WHO'S GOT THE RHYTHM",
    path: '/boom-garden',
    bg: 'assets/backgrounds/football-field.png',
    color: '#FF9500',
    accent: '#E67E22',
    character: 'assets/characters/chunk-marching.png',
    charWidthPct: 34,
    decoration: 'sparkles',
    sfx: 'assets/audio/Snare.mp3',
  },
  {
    id: 'ear-quest',
    title: 'EAR QUEST',
    path: '/ear-trainer',
    bg: 'assets/backgrounds/beach.png',
    color: '#FF9500',
    accent: '#E67E22',
    character: 'assets/characters/dr-jellybone.png',
    charWidthPct: 22,
    decoration: 'sparkles',
    sfx: 'assets/audio/sfx-arpeggio.mp3',
  },
  {
    id: 'name-that-note',
    title: 'NAME THAT NOTE',
    path: '/name-that-note',
    bg: 'assets/backgrounds/chalkboard.png',
    color: '#2E7D5B',
    accent: '#1B5E40',
    character: 'assets/characters/finn-danger.png',
    charWidthPct: 24,
    decoration: 'notes-crazy',
    sfx: 'assets/audio/sfx-bell-chime.mp3',
  },
];

export default function LearnMenuPage() {
  return (
    <SubMenuPage
      testId="learn-menu-page"
      sectionTitle="LEARN"
      sectionSubtitle="LEARN"
      sectionColor="#1E88E5"
      bgGradient="radial-gradient(circle at 20% 20%, #C7E9FF 0%, transparent 50%), radial-gradient(circle at 80% 80%, #B5D8F2 0%, transparent 55%), linear-gradient(180deg, #E6F4FF 0%, #BFE0F8 100%)"
      tiles={LEARN_TILES}
    />
  );
}
