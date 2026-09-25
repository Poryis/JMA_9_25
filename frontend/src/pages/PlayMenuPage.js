import SubMenuPage from '../components/SubMenuPage';

const PLAY_TILES = [
  {
    id: 'jelly-jukebox',
    title: 'JELLY JUKEBOX',
    path: '/rhythm-game',
    bg: 'assets/backgrounds/jukebox-floor-1.png',
    bgPosition: 'center',
    color: '#FF3B30',
    accent: '#C0392B',
    character: 'assets/characters/lou-disco.png',
    charWidthPct: 32,
    decoration: 'notes',
    sfx: 'assets/audio/sfx-rhythm-fill.mp3',
  },
  {
    id: 'stew-kazoo',
    title: 'STEW KAZOO SAYS',
    path: '/simon-says',
    bg: 'assets/backgrounds/underwater.png',
    color: '#4285F4',
    accent: '#1ABC9C',
    character: 'assets/characters/stew.png',
    charWidthPct: 28,
    decoration: 'notes',
    sfx: 'assets/audio/sfx-kazoo-honk.mp3',
  },
  {
    id: 'note-match',
    title: 'NOTE MATCH',
    path: '/note-match',
    bg: 'assets/backgrounds/boat.png',
    bgPosition: 'center bottom',
    color: '#0FA3B1',
    accent: '#0A6E7A',
    character: 'assets/characters/charlie-surf.png',
    charWidthPct: 30,
    decoration: 'notes',
    sfx: 'assets/audio/sfx-bell-pair.mp3',
  },
  {
    id: 'detective-jellybone',
    title: 'DETECTIVE DR. JELLYBONE',
    path: '/detective',
    bg: 'assets/backgrounds/detective-room.jpg',
    color: '#9B6DE0',
    accent: '#5E2D8C',
    character: 'assets/characters/dr-jellybone-detective.png',
    charWidthPct: 34,
    decoration: 'sparkles',
    sfx: 'assets/audio/sfx-detective.mp3',
  },
  {
    id: 'sight-reading',
    title: 'SIGHT-READING SPRINT',
    path: '/sight-reading',
    bg: 'assets/backgrounds/clubhouse.png',
    color: '#34A853',
    accent: '#1F7A36',
    character: 'assets/characters/charlie-grad.png',
    charWidthPct: 30,
    decoration: 'clouds',
    sfx: 'assets/audio/sfx-bell-pair.mp3',
  },
];

export default function PlayMenuPage() {
  return (
    <SubMenuPage
      testId="play-menu-page"
      sectionTitle="PLAY"
      sectionSubtitle="PLAY"
      sectionColor="#E94B3C"
      bgGradient="radial-gradient(circle at 20% 20%, #FFE5A6 0%, transparent 50%), radial-gradient(circle at 80% 80%, #FFD9B0 0%, transparent 55%), linear-gradient(180deg, #FFF5DC 0%, #FFD89E 100%)"
      tiles={PLAY_TILES}
    />
  );
}
