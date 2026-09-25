import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, RotateCcw, Trophy, Star, Music } from 'lucide-react';

function ResultsPage({ score, gameStats, resetGame }) {
  const navigate = useNavigate();

  const totalNotes = gameStats.perfect + gameStats.great + gameStats.good + gameStats.miss;
  const accuracy = totalNotes > 0 
    ? Math.round((gameStats.perfect + gameStats.great + gameStats.good) / totalNotes * 100)
    : 0;

  // Determine rating
  let rating, ratingColor, message;
  if (accuracy >= 90) {
    rating = 'SUPERSTAR!';
    ratingColor = '#FFD700';
    message = "You're a music genius!";
  } else if (accuracy >= 70) {
    rating = 'GREAT JOB!';
    ratingColor = '#4CD964';
    message = 'Keep practicing!';
  } else if (accuracy >= 50) {
    rating = 'GOOD TRY!';
    ratingColor = '#4285F4';
    message = "You're getting better!";
  } else {
    rating = 'KEEP GOING!';
    ratingColor = '#FF9500';
    message = 'Practice makes perfect!';
  }

  const handlePlayAgain = () => {
    resetGame();
    navigate(-1);
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center jma-safe-center p-4 pt-20 md:pt-24 lg:pt-32 pb-8" 
      data-testid="results-page"
      style={{
        backgroundImage: 'url(assets/backgrounds/circus.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Trophy animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="mb-6"
      >
        <div 
          className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center border-6 border-[var(--jma-dark)]"
          style={{ backgroundColor: ratingColor }}
        >
          <Trophy className="w-12 h-12 md:w-16 md:h-16 text-white" />
        </div>
      </motion.div>

      {/* Rating */}
      <motion.h1
        className="text-4xl md:text-6xl font-black mb-2 text-center"
        style={{ 
          color: ratingColor, 
          fontFamily: "'Fredoka', cursive",
        }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {rating}
      </motion.h1>

      <motion.p
        className="text-lg md:text-xl mb-8"
        style={{ color: 'var(--jma-dark)', fontFamily: "'Fredoka', cursive" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {message}
      </motion.p>

      {/* Score card */}
      <motion.div
        className="game-card p-6 md:p-8 w-full max-w-md mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {/* Score */}
        <div className="text-center mb-6">
          <p className="text-sm uppercase opacity-70 mb-1">Final Score</p>
          <p 
            className="text-5xl md:text-6xl font-black"
            style={{ color: 'var(--jma-dark)', fontFamily: "'Fredoka', cursive" }}
          >
            {score.toLocaleString()}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#4CD96420' }}>
            <p className="text-2xl font-bold" style={{ color: '#4CD964' }}>{gameStats.perfect}</p>
            <p className="text-sm font-medium">Perfect</p>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ backgroundColor: '#FF3B3020' }}>
            <p className="text-2xl font-bold" style={{ color: '#FF3B30' }}>{gameStats.miss}</p>
            <p className="text-sm font-medium">Miss</p>
          </div>
        </div>

        {/* Accuracy & Streak */}
        <div className="flex justify-between items-center pt-4 border-t-2 border-[var(--jma-dark)]">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: '#FFCC00' }} />
            <span className="font-bold">{accuracy}% Accuracy</span>
          </div>
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5" style={{ color: '#FF9500' }} />
            <span className="font-bold">{gameStats.maxStreak}x Max Streak</span>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="flex gap-4"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.button
          data-testid="play-again-button"
          className="chunky-btn bg-[var(--jma-green)] text-white px-6 py-3 flex items-center gap-2"
          onClick={handlePlayAgain}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RotateCcw className="w-5 h-5" />
          <span className="font-bold">Play Again</span>
        </motion.button>

        <motion.button
          data-testid="home-button-results"
          className="chunky-btn bg-white px-6 py-3 flex items-center gap-2"
          style={{ color: 'var(--jma-dark)' }}
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Home className="w-5 h-5" />
          <span className="font-bold">Home</span>
        </motion.button>
      </motion.div>

      {/* Characters celebrating - Finn Danger and Charlie the Polliwog */}
      <motion.div 
        className="fixed bottom-4 left-4 hidden lg:block"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.img
          src="assets/characters/finn-danger.png"
          alt="Finn Danger"
          className="w-28 h-auto"
          animate={{ y: [0, -20, 0], rotate: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.div 
        className="fixed bottom-4 right-4 hidden lg:block"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <motion.img
          src="assets/characters/charlie-polliwog.png"
          alt="Charlie the Polliwog"
          className="w-28 h-auto"
          animate={{ y: [0, -20, 0], rotate: [5, -5, 5] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut', delay: 0.2 }}
        />
      </motion.div>
    </div>
  );
}

export default ResultsPage;
