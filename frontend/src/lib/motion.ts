export const FAST = 0.15;
export const NORMAL = 0.25;
export const SLOW = 0.4;

export const easePremium: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const easeOut: [number, number, number, number] = [0, 0, 0.2, 1];
export const easeIn: [number, number, number, number] = [0.4, 0, 1, 1];
export const easeBounce: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export const transitionFast = {
    duration: FAST,
    ease: easePremium,
};

export const transitionNormal = {
    duration: NORMAL,
    ease: easePremium,
};

export const transitionSlow = {
    duration: SLOW,
    ease: easePremium,
};

export const transitionSpring = {
    type: 'spring',
    stiffness: 400,
    damping: 30,
};

export const transitionBounce = {
    type: 'spring',
    stiffness: 500,
    damping: 25,
    mass: 0.5,
};

export const pageVariants = {
    initial: {
        opacity: 0,
        y: 8,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: transitionNormal,
    },
    exit: {
        opacity: 0,
        y: -6,
        transition: transitionFast,
    },
};

export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.04,
        },
    },
};

export const staggerItem = {
    initial: { opacity: 0, y: 10 },
    animate: {
        opacity: 1,
        y: 0,
        transition: transitionNormal
    },
};

export const cardHover = {
    rest: {
        y: 0,
        scale: 1,
    },
    hover: {
        y: -4,
        scale: 1.01,
        transition: transitionFast,
    },
    tap: {
        y: -2,
        scale: 0.99,
        transition: transitionFast,
    },
};

export const dropdownVariants = {
    initial: {
        opacity: 0,
        scale: 0.96,
        y: 8,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.2,
            ease: easePremium,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.96,
        y: 8,
        transition: {
            duration: 0.15,
            ease: easeIn,
        },
    },
};

export const modalVariants = {
    initial: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: transitionSpring,
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 20,
        transition: {
            duration: 0.2,
            ease: easeIn,
        },
    },
};

export const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const buttonPress = {
    rest: { scale: 1 },
    hover: {
        scale: 1.02,
        transition: transitionFast,
    },
    tap: {
        scale: 0.97,
        transition: transitionFast,
    },
};

export const focusGlow = {
    rest: {
        boxShadow: '0 0 0 0px rgba(59, 130, 246, 0)',
    },
    focus: {
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.12)',
        transition: transitionFast,
    },
};

export const listStagger = {
    animate: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

export const listItem = {
    initial: { opacity: 0, x: -10 },
    animate: {
        opacity: 1,
        x: 0,
        transition: transitionNormal,
    },
};

export const notificationVariants = {
    initial: {
        opacity: 0,
        y: -20,
        scale: 0.95,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: transitionSpring,
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.95,
        transition: transitionFast,
    },
};

export const skeletonPulse = {
    animate: {
        opacity: [0.5, 1, 0.5],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};
