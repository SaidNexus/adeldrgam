import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

// Page transition wrapper
export const MotionPage = ({ children, className = '', ...props }: HTMLMotionProps<'div'>) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

// Card hover effect
export const MotionCard = ({ children, className = '', ...props }: HTMLMotionProps<'div'>) => (
    <motion.div
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

// Button press effect
export const MotionButton = ({ children, className = '', ...props }: HTMLMotionProps<'button'>) => (
    <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className={className}
        {...props}
    >
        {children}
    </motion.button>
);

// Fade in
export const MotionFadeIn = ({ children, className = '', delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.3 }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

// Stagger container for lists
export const MotionList = ({ children, className = '', ...props }: HTMLMotionProps<'div'>) => (
    <motion.div
        initial="hidden"
        animate="visible"
        variants={{
            visible: { transition: { staggerChildren: 0.05 } }
        }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

// Stagger item
export const MotionListItem = ({ children, className = '', ...props }: HTMLMotionProps<'div'>) => (
    <motion.div
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
        }}
        transition={{ duration: 0.2 }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);
