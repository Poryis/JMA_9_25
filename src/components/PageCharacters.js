import { motion } from 'framer-motion';

// Character pool
const ALL_CHARACTERS = [
  { name: 'Finn', image: 'assets/characters/finn-danger.png' },
  { name: 'Charlie', image: 'assets/characters/charlie-polliwog.png' },
  { name: 'Chunk', image: 'assets/characters/chunk.png' },
  { name: 'Jazzy', image: 'assets/characters/jazzy.png' },
  { name: 'Dr. Jellybone', image: 'assets/characters/dr-jellybone.png' },
  { name: 'Lou & Stew', image: 'assets/characters/llama-lou-stew.png' },
  { name: 'Stew', image: 'assets/characters/stew.png' },
];

// Picks characters based on a seed (page name) so each page gets consistent but different characters
function getCharactersForPage(pageName, count = 2) {
  const hash = pageName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...ALL_CHARACTERS].sort((a, b) => {
    const ha = (hash * 31 + a.name.charCodeAt(0)) % 100;
    const hb = (hash * 31 + b.name.charCodeAt(0)) % 100;
    return ha - hb;
  });
  return shuffled.slice(0, count);
}

export function PageCharacters({ page }) {
  const chars = getCharactersForPage(page, 2);

  return (
    <>
      <motion.div
        className="fixed bottom-3 left-3 z-20 hidden md:block"
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.img
          src={chars[0].image}
          alt={chars[0].name}
          className="w-16 h-20 object-contain drop-shadow-md"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        />
      </motion.div>
      <motion.div
        className="fixed bottom-3 right-3 z-20 hidden md:block"
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.img
          src={chars[1].image}
          alt={chars[1].name}
          className="w-16 h-20 object-contain drop-shadow-md"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', delay: 0.3 }}
        />
      </motion.div>
    </>
  );
}

export default PageCharacters;
