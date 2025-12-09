"use client";

import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}

export function FadeIn({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: delay }}
        >
            {children}
        </motion.div>
    )
}

export function SlideIn({ children, delay = 0, direction = "left" }: { children: React.ReactNode, delay?: number, direction?: "left" | "right" | "up" | "down" }) {
    const variants = {
        hidden: {
            x: direction === "left" ? -20 : direction === "right" ? 20 : 0,
            y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
            opacity: 0
        },
        visible: { x: 0, y: 0, opacity: 1 }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.4, delay, ease: "easeOut" }}
            variants={variants}
        >
            {children}
        </motion.div>
    )
}
