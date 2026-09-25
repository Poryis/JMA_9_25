import SubMenuPage from '../components/SubMenuPage';

const CREATE_TILES = [
  {
    id: 'jam-session',
    title: 'JAM SESSION',
    path: '/free-play',
    bg: 'assets/backgrounds/jelly-stage.png',
    color: '#4CD964',
    accent: '#34A853',
    character: 'assets/characters/charlie-punk.png',
    charWidthPct: 35,
    decoration: 'notes',
    sfx: 'assets/audio/sfx-drum-fill.mp3',
  },
  {
    id: 'beat-lab',
    title: 'BEAT LAB',
    path: '/loop-studio',
    bg: 'assets/backgrounds/graffiti-wall.jpg',
    color: '#AF52DE',
    accent: '#8E44AD',
    character: 'assets/characters/jelly-rap-trio.png',
    charWidthPct: 52,
    decoration: 'sparkles',
    sfx: 'assets/audio/sfx-dj-scratch.mp3',
  },
  {
    id: 'robot-boogie',
    title: 'ROBOT BOOGIE',
    path: '/robot-boogie',
    bg: 'assets/backgrounds/robot-boogie-card.svg',
    color: '#5A2989',
    accent: '#3B1F5C',
    character: 'assets/robot-boogie/robot1-card-hero.png',
    charWidthPct: 45,
    decoration: 'sparkles',
    // No SFX preview on this card — the source stem is an 8-s loop and
    // even a short-capped preview reads as "a second of music that cuts
    // out." Card click just navigates.
  },
  {
    id: 'song-studio',
    title: "CHARLIE'S SONG STUDIO",
    path: '/song-studio',
    bg: 'assets/backgrounds/charlie-in-studio.jpg',
    color: '#FFCC00',
    accent: '#F39C12',
    decoration: 'notes',
    sfx: 'assets/audio/sfx-piano-flourish.mp3',
  },
];

export default function CreateMenuPage() {
  return (
    <SubMenuPage
      testId="create-menu-page"
      sectionTitle="CREATE"
      sectionSubtitle="CREATE"
      sectionColor="#C2185B"
      bgGradient="radial-gradient(circle at 20% 20%, #FFE0EF 0%, transparent 50%), radial-gradient(circle at 80% 80%, #F2C7E2 0%, transparent 55%), linear-gradient(180deg, #FFEBF5 0%, #F9CDE3 100%)"
      tiles={CREATE_TILES}
    />
  );
}
