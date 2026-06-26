"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/AnimatedSection";

/* ─── Types ─────────────────────────────────────────────── */
interface FaqItem {
  id: number;
  category: string;
  question: string;
  answer: string;
  icon: string;
}

/* ─── FAQ Data ──────────────────────────────────────────── */
const faqData: FaqItem[] = [
  {
    id: 1,
    category: "መግቢያ",
    question: "Adonay TikTok Academy ምንድን ነው?",
    answer:
      "Adonay TikTok Academy ፈጣሪዎች፣ ንግድ ባለቤቶች፣ ተማሪዎች እና በማህበራዊ ሚዲያ ላይ ተፅዕኖ መፍጠር የሚፈልጉ ሰዎች ፐርሰናል ብራንድ እንዲገነቡ፣ ኮንቴንት እንዲፈጥሩ እና በTikTok እና በሌሎች የማህበራዊ ሚዲያ መድረኮች እንዲያድጉ የሚያግዝ ዘመናዊ የመማሪያ መድረክ ነው።",
    icon: "🎓",
  },
  {
    id: 2,
    category: "ተሳትፎ",
    question: "ኮርሶቹ ለማን ተስማሚ ናቸው?",
    answer:
      "ኮርሶቹ ለጀማሪ ፈጣሪዎች፣ TikTok ማሳደግ ለሚፈልጉ፣ ፐርሰናል ብራንድ ለሚገነቡ፣ ቢዝነሳቸውን በማህበራዊ ሚዲያ ለማሳደግ ለሚፈልጉ፣ ኢንፍሉዌንሰር መሆን ለሚፈልጉ እና በኮንቴንት ፍጠራ ስራ ለሚሰሩ ሁሉ ተስማሚ ናቸው።",
    icon: "🎯",
  },
  {
    id: 3,
    category: "መስፈርቶች",
    question: "ኮርሶቹን ለመከታተል ልምድ ያስፈልጋል?",
    answer:
      "አይፈልግም። ኮርሶቹ ከጀማሪ እስከ ከፍተኛ ደረጃ ድረስ በቀላሉ እንዲከተሉ ተዘጋጅተዋል። ምንም አይነት የቅድመ ልምድ ሳያስፈልግ በቀላሉ መጀመር ይችላሉ።",
    icon: "🚀",
  },
  {
    id: 4,
    category: "ተደራሽነት",
    question: "ኮርሶቹን ከገዛሁ በኋላ ለምን ያህል ጊዜ አገኛቸዋለሁ?",
    answer:
      "ከተመዘገቡ በኋላ ኮርሶቹን በማንኛውም ጊዜ እና በማንኛውም ቦታ ማየት ይችላሉ። የኮርሱ ቁሳቁሶች የዘመን ገደብ የላቸውም — በፈለጉት ፍጥነት መማር ይችላሉ።",
    icon: "⏰",
  },
  {
    id: 5,
    category: "ተደራሽነት",
    question: "ኮርሶቹን በስልክ መከታተል እችላለሁ?",
    answer:
      "አዎ። ኮርሶቹ በሞባይል፣ ታብሌት እና ኮምፒውተር ላይ እንዲሰሩ ተዘጋጅተዋል። በማንኛውም መሳሪያ ላይ ምቹ የሆነ የመማር ልምድ ያገኛሉ።",
    icon: "📱",
  },
  {
    id: 6,
    category: "ውጤት",
    question: "ከኮርሱ በኋላ ውጤት አገኛለሁ?",
    answer:
      "ውጤት በተማሪው ትጋት፣ ቀጣይነት እና ተግባራዊ አፈጻጸም ላይ ይመሰረታል። ነገር ግን በኮርሱ ውስጥ የሚሰጡት ስልቶች በተግባር የተፈተኑ እና ውጤታማ ዘዴዎች ናቸው። ተማሪዎቻችን በአጭር ጊዜ ውስጥ አስደናቂ ውጤት ሲያስመዘግቡ ተመልክተናል።",
    icon: "📊",
  },
  {
    id: 7,
    category: "ትምህርት",
    question: "የሚሰጡት ትምህርቶች ቲዎሪ ናቸው ወይስ ተግባራዊ?",
    answer:
      "የአካዳሚው ዋና ትኩረት ተግባራዊ እና ውጤት ተኮር ትምህርት ላይ ነው። የሚማሩትን ነገር ወዲያውኑ በራስዎ ኮንቴንት ላይ መተግበር ይችላሉ። እያንዳንዱ ትምህርት ተግባራዊ ምሳሌዎችን እና የእውነተኛ ህይወት ጉዳዮችን ያካትታል።",
    icon: "⚡",
  },
  {
    id: 8,
    category: "ርዕሶች",
    question: "የትኞቹን ርዕሶች እማራለሁ?",
    answer:
      "የሚከተሉትን ርዕሶች ይማራሉ: TikTok Growth Strategy፣ Personal Branding፣ Viral Content Creation፣ Storytelling፣ Content Psychology፣ Audience Building፣ Camera Confidence፣ Creator Monetization እና Social Media Growth። እያንዳንዱ ርዕስ ከሌላው ጋር ተያይዞ ሙሉ የእውቀት ስርዓት ይፈጥራል።",
    icon: "📚",
  },
  {
    id: 9,
    category: "ክፍያ",
    question: "የክፍያ አማራጮች ምንድን ናቸው?",
    answer:
      "የተለያዩ የክፍያ አማራጮች ይገኛሉ። ዝርዝር መረጃ ለማግኘት የክፍያ ገጹን ይመልከቱ ወይም የድጋፍ ቡድናችንን ያነጋግሩ። ደንበኞቻችንን ምቹ የክፍያ ዘዴዎችን እናቀርባለን።",
    icon: "💳",
  },
  {
    id: 10,
    category: "ድጋፍ",
    question: "እርዳታ ካስፈለገኝ እንዴት ማግኘት እችላለሁ?",
    answer:
      "የድጋፍ ቡድናችን ሁልጊዜ ለመርዳት ዝግጁ ነው። በኢሜይል፣ በWhatsApp ወይም በስራ ሰዓት ውስጥ ማነጋገር ይችላሉ።",
    icon: "💬",
  },
  {
    id: 11,
    category: "ምርጫ",
    question: "ለምን Adonay TikTok Academy እመርጣለሁ?",
    answer:
      "ምክንያቱም የሚሰጡት ትምህርቶች ከቲዎሪ የተለየ፣ በቢሊዮኖች እይታዎች የተፈተነ እና በተግባር ውጤት ያሳየ ልምድ ላይ የተመሰረቱ ናቸው። ዓላማችን ተከታዮችን ብቻ ማሳደግ አይደለም፤ የማይረሳ ፐርሰናል ብራንድ እንዲገነቡ ማገዝ ነው።",
    icon: "🏆",
  },
];

/* ─── Categories ────────────────────────────────────────── */

/* ─── Particle Field ───────────────────────────────────── */
function ParticleField() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" />
    );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-secondary/20 blur-[1px]"
          style={{
            left: `${(i * 13 + 7) % 100}%`,
            top: `${(i * 19 + 11) % 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, i % 2 === 0 ? 20 : -20, 0],
            opacity: [0.1, 0.5, 0.1],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 5 + (i % 5),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 6) * 0.4,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Section Divider ──────────────────────────────────── */

/* ─── Floating Badge ───────────────────────────────────── */
function FloatingBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`absolute hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 text-white/90 text-sm ${className}`}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      {label}
    </motion.div>
  );
}

/* ─── Accordion Item ───────────────────────────────────── */
function AccordionItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`group rounded-2xl border transition-all duration-300 ${
        isOpen
          ? "border-secondary/40 bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent shadow-lg shadow-secondary/10"
          : "border-white/10 bg-white/5 hover:bg-white/[0.07] hover:border-white/20"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 sm:px-7 py-5 sm:py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 rounded-2xl"
        aria-expanded={isOpen}
      >
        {/* Icon */}
        <span className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-accent/10 flex items-center justify-center text-lg sm:text-xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
          {item.icon}
        </span>

        {/* Question */}
        <div className="flex-1 min-w-0">
          <span
            className={`block text-sm sm:text-base font-semibold transition-colors duration-300 ${
              isOpen ? "text-secondary" : "text-white/80 group-hover:text-white"
            }`}
          >
            {item.question}
          </span>
          {/* Category badge - visible on mobile in compact mode */}
          <span className="sm:hidden inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/50">
            {item.category}
          </span>
        </div>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
            isOpen
              ? "bg-secondary text-white"
              : "bg-white/10 text-white/50 group-hover:bg-white/20 group-hover:text-white/80"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-7 pb-6 sm:pb-7">
              <div className="h-px bg-gradient-to-r from-secondary/30 via-secondary/10 to-transparent mb-4" />
              <p className="text-sm sm:text-base text-white/70 leading-relaxed sm:leading-loose">
                {item.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Contact Card ─────────────────────────────────────── */
function ContactCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl border border-secondary/20 bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent p-8 sm:p-12"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-8">
          <motion.span
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-xs sm:text-sm font-medium mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            ድጋፍ ያግኙ
          </motion.span>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            አሁንም ጥያቄ አለዎት?
          </h3>
          <p className="text-white/60 max-w-lg mx-auto">
            የድጋፍ ቡድናችን ሁልጊዜ ለመርዳት ዝግጁ ነው። በማንኛውም ጊዜ ሊያገኙን ይችላሉ።
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto">
          {/* Email */}
          <motion.a
            href="mailto:support@adonayacademy.com"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-secondary/30 hover:bg-secondary/5 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
              <svg
                className="w-6 h-6 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider">
                Email
              </p>
              <p className="text-sm sm:text-base text-white/80 group-hover:text-secondary transition-colors font-medium">
                support@adonayacademy.com
              </p>
            </div>
          </motion.a>

          {/* WhatsApp */}
          <motion.a
            href="#"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-secondary/30 hover:bg-secondary/5 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
              <svg
                className="w-6 h-6 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider">
                WhatsApp
              </p>
              <p className="text-sm sm:text-base text-white/80 group-hover:text-secondary transition-colors font-medium">
                +251 XX XXX XXXX
              </p>
            </div>
          </motion.a>

          {/* Working Hours */}
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            className="flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-secondary/30 hover:bg-secondary/5 transition-all duration-300 group"
          >
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
              <svg
                className="w-6 h-6 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider">
                የስራ ሰዓት
              </p>
              <p className="text-sm sm:text-base text-white/80 font-medium">
                ሰኞ – ቅዳሜ
              </p>
              <p className="text-xs text-white/50">3:00 ጠዋት – 12:00 ማታ</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN FAQ PAGE
   ══════════════════════════════════════════════════════════ */
export default function FaqPage() {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("ሁሉም");
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Scroll listener for sticky header effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return faqData.filter((item) => {
      const matchesCategory =
        activeCategory === "ሁሉም" || item.category === activeCategory;
      const matchesSearch =
        searchQuery === "" ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const toggleFaq = (id: number) => {
    setActiveId(activeId === id ? null : id);
  };

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0604] overflow-hidden">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative min-h-[60vh] sm:min-h-[50vh] flex items-center pt-24 pb-16 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-40 w-[30rem] h-[30rem] bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <FloatingBadge label="📚 11+ ጥያቄዎች" className="top-24 right-8" />
        <FloatingBadge label="⚡ ፈጣን ምላሽ" className="bottom-32 left-8" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <AnimatedSection direction="up" duration={0.6}>
            <div className="text-center mb-8 sm:mb-10">
              {/* Section tag */}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/20 border border-secondary/30 text-secondary text-xs sm:text-sm font-medium mb-4 sm:mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                ተደጋጋሚ ጥያቄዎች
              </motion.span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight">
                መልስ ያግኙ{" "}
                <span className="bg-gradient-to-r from-secondary via-amber-400 to-accent bg-clip-text text-transparent">
                  ያፍሩ
                </span>
              </h1>
              <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
                ስለ Adonay TikTok Academy በተደጋጋሚ የሚጠየቁ ጥያቄዎች መልስ ያግኙ። የሚፈልጉትን መረጃ
                ለማግኘት ከታች ያስሱ።
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto mb-6 sm:mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/30 via-accent/20 to-secondary/30 rounded-2xl blur-xl opacity-30 group-focus-within:opacity-60 transition-opacity duration-500" />
                <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden focus-within:border-secondary/50 focus-within:bg-white/[0.12] transition-all duration-300 shadow-xl shadow-black/20">
                  <div className="flex-shrink-0 pl-4 sm:pl-5">
                    <svg
                      className="w-5 h-5 text-white/40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveId(null);
                    }}
                    placeholder="ጥያቄ ይፈልጉ... (Ctrl+K)"
                    className="w-full bg-transparent text-white placeholder-white/40 px-3 sm:px-4 py-3.5 sm:py-4 text-sm sm:text-base focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="flex-shrink-0 pr-4 sm:pr-5 text-white/40 hover:text-white/70 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                  <kbd className="hidden sm:inline-flex flex-shrink-0 mr-4 items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-[10px] text-white/30 font-mono">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Category Pills */}
          <AnimatedSection direction="up" delay={0.2} duration={0.5}>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {categories.map((cat) => (
                <motion.button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setActiveId(null);
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                    activeCategory === cat.key
                      ? "bg-gradient-to-r from-secondary to-accent text-white shadow-lg shadow-secondary/30 scale-105"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80 border border-white/10"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </motion.button>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════ FAQ LIST SECTION ═══════════════ */}
      <section className="relative pb-16 sm:pb-24">
        {/* Results count */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
          <AnimatedSection direction="up" delay={0.1}>
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-white/50">
                {searchQuery || activeCategory !== "ሁሉም"
                  ? `${filteredFaqs.length} ውጤቶች ተገኝተዋል`
                  : `${faqData.length} ጥያቄዎች`}
              </p>
              {filteredFaqs.length > 0 && (
                <button
                  onClick={() => {
                    if (activeId !== null) {
                      setActiveId(null);
                    } else {
                      filteredFaqs.forEach((_, i) => {
                        // Toggle all: open all
                        const allIds = filteredFaqs.map((f) => f.id);
                        // If none open, open all
                        if (allIds.every((id) => id !== activeId)) {
                          // We can't open all at once in our single-select design,
                          // but we can expand them one by one
                        }
                      });
                    }
                  }}
                  className="text-xs text-white/40 hover:text-secondary transition-colors"
                >
                  {activeId !== null ? "ሁሉንም ዝጋ" : "ሁሉንም ክፈት"}
                </button>
              )}
            </div>
          </AnimatedSection>
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 sm:space-y-4">
          {filteredFaqs.length > 0 ? (
            <StaggerContainer staggerDelay={0.04}>
              {filteredFaqs.map((item, index) => (
                <StaggerItem key={item.id}>
                  <AccordionItem
                    item={item}
                    isOpen={activeId === item.id}
                    onToggle={() => toggleFaq(item.id)}
                    index={index}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 sm:py-20"
            >
              <div className="text-5xl sm:text-6xl mb-4">🔍</div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                ምንም ውጤት አልተገኘም
              </h3>
              <p className="text-white/50 mb-6">
                እባክዎ የተለየ ቃል ይሞክሩ ወይም ምድብ ይምረጡ።
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("ሁሉም");
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-secondary to-accent text-white font-semibold hover:shadow-lg hover:shadow-secondary/30 transition-all"
              >
                ሁሉንም አሳይ
              </button>
            </motion.div>
          )}
        </div>

        {/* Expand All / Collapse All */}
        {filteredFaqs.length > 1 && (
          <div className="text-center mt-6 sm:mt-8">
            <button
              onClick={() => setActiveId(activeId === null ? -1 : null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/30 text-white/70 hover:text-white text-sm transition-all duration-300"
            >
              {activeId !== null ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  ሁሉንም ዝጋ
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  ሁሉንም ክፈት
                </>
              )}
            </button>
          </div>
        )}

        {/* ═══════════════ DIVIDER ═══════════════ */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 my-12 sm:my-16">
          <SectionDivider />
        </div>

        {/* ═══════════════ CONTACT SECTION ═══════════════ */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ContactCard />
        </div>

        {/* ═══════════════ CTA SECTION ═══════════════ */}
        <AnimatedSection direction="up" delay={0.2}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 text-center">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="inline-flex items-center gap-3 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-secondary/20 via-accent/10 to-secondary/20 border border-secondary/30 hover:border-secondary/50 transition-all duration-300 cursor-pointer"
            >
              <span className="text-2xl">🚀</span>
              <div>
                <p className="text-white font-semibold text-sm sm:text-base">
                  ለመጀመር ዝግጁ ነዎት?
                </p>
                <Link
                  href="/courses"
                  className="text-secondary hover:text-accent text-xs sm:text-sm underline underline-offset-4 decoration-secondary/30 hover:decoration-secondary transition-all"
                >
                  ኮርሶቻችንን ይመልከቱ →
                </Link>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
