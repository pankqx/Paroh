import { motion } from 'motion/react';
import { BrandMark } from '../components/BrandMark';

const WORD = 'Paroh'.split('');

/** The opening moment: the mark draws itself, the name settles in, then the room opens. */
export function Splash() {
  return (
    <motion.div
      className="splash"
      role="status"
      aria-label="Opening Paroh"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="splash-glow" aria-hidden="true" />
      <motion.div initial={{ opacity: 0, scale: 0.86, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <BrandMark size={76} drawn />
      </motion.div>
      <h1 className="splash-word" aria-hidden="true">
        {WORD.map((ch, i) => (
          <motion.span key={i} initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.35 + i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            {ch}
          </motion.span>
        ))}
      </h1>
      <motion.p className="splash-tagline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.6 }}>
        a quiet room for your days
      </motion.p>
      <div className="splash-line" aria-hidden="true">
        <span />
      </div>
    </motion.div>
  );
}
