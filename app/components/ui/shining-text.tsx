"use client";

import { motion } from "framer-motion";

interface ShiningTextProps {
  text: string;
  className?: string;
}

export function ShiningText({ text, className }: ShiningTextProps) {
  return (
    <motion.span
      className={
        className ??
        "bg-[linear-gradient(110deg,rgba(255,255,255,0.25),35%,rgba(255,255,255,0.9),50%,rgba(255,255,255,0.25),75%,rgba(255,255,255,0.25))] bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent"
      }
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: "-200% 0" }}
      transition={{
        repeat: Infinity,
        duration: 1.8,
        ease: "linear",
      }}
    >
      {text}
    </motion.span>
  );
}
