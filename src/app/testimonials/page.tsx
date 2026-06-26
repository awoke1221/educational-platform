"use client";
import { useEffect, useState, useRef } from "react";

interface VideoTestimonial {
  id: string;
  name: string;
  title: string;
  videoUrl: string;
  duration: number;
}

interface TextTestimonial {
  id: string;
  name: string;
  title: string;
  company: string;
  text: string;
  rating: number;
}

interface ImageTestimonial {
  id: string;
  name: string;
  title: string;
  text: string;
  image: string;
  rating: number;
}

// Skeleton Loader
function SkeletonCard() {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 animate-pulse">
      <div className="h-48 bg-white/10" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded bg-white/20" />
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-2/3 rounded bg-white/10" />
      </div>
    </div>
  );
}

// Video Testimonials Section
function VideoTestimonialsSection() {
  const [videoTestimonials, setVideoTestimonials] = useState<
    VideoTestimonial[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoTestimonial | null>(
    null,
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const testimonials: VideoTestimonial[] = [];
    setVideoTestimonials(testimonials);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedVideo && videoRef.current) {
      videoRef.current.play();
    }
  }, [selectedVideo]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (videoTestimonials.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/50">
          No video testimonials are available yet. Please check back later for
          real student submissions.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videoTestimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="group bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-white/20 hover:border-secondary/50 cursor-pointer"
            onClick={() => setSelectedVideo(testimonial)}
          >
            <div className="relative h-48 bg-gradient-to-br from-primary to-secondary overflow-hidden">
              <video
                src={testimonial.videoUrl}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <button className="bg-white/90 hover:bg-white text-primary p-3 rounded-full transition-all transform group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-black/20">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full">
                {testimonial.duration}s
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-white mb-1">{testimonial.name}</h3>
              <p className="text-sm text-white/50 mb-3">{testimonial.title}</p>
              <p className="text-xs text-secondary font-medium">Watch now</p>
            </div>
          </div>
        ))}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-black rounded-2xl overflow-hidden max-w-4xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video Container */}
            <div className="relative bg-black aspect-video">
              <video
                ref={videoRef}
                src={selectedVideo.videoUrl}
                className="w-full h-full"
                controls
                autoPlay
              />
            </div>

            {/* Info Section */}
            <div className="bg-gradient-to-br from-primary to-primary-light p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">{selectedVideo.name}</h2>
              <p className="text-secondary font-medium mb-3">
                {selectedVideo.title}
              </p>
              <p className="text-white/60 text-sm">
                Learn how AD LMS helped these students grow with engaging
                courses and practical skills training.
              </p>

              {/* Close Button */}
              <button
                onClick={() => setSelectedVideo(null)}
                className="mt-4 bg-secondary hover:brightness-90 text-white px-6 py-2.5 rounded-lg font-semibold transition-all inline-flex items-center gap-2"
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
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Text Testimonials Section
function TextTestimonialsSection() {
  const [textTestimonials, setTextTestimonials] = useState<TextTestimonial[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testimonials: TextTestimonial[] = [
      {
        id: "txt-1",
        name: "Emma Johnson",
        title: "Content Strategist",
        company: "Bright Media",
        text: "Adonay's method on understanding audience psychology changed everything. I applied his storytelling framework and my content went viral within a week!",
        rating: 5,
      },
      {
        id: "txt-2",
        name: "Liam Patel",
        title: "Social Media Manager",
        company: "Creative Studio",
        text: "I used to struggle with camera confidence until I took Adonay's training. Now I record content naturally and my engagement has tripled. Life-changing!",
        rating: 5,
      },
      {
        id: "txt-3",
        name: "Sophia Lee",
        title: "TikTok Creator",
        company: "Tech Works",
        text: "Adonay's community is incredible. The support, the feedback, and the proven strategies helped me grow from zero to 100K followers in 2 months.",
        rating: 5,
      },
      {
        id: "txt-4",
        name: "Noah Brown",
        title: "Personal Brand Coach",
        company: "Growth Labs",
        text: "I've taken many courses but Adonay's is different — he breaks down exactly how he built a 6M+ audience and shows you how to do the same step by step.",
        rating: 5,
      },
    ];
    setTextTestimonials(testimonials);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 animate-pulse space-y-4"
          >
            <div className="h-4 w-3/4 rounded bg-white/20" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-2/3 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
      {textTestimonials.map((testimonial, idx) => (
        <motion.div
          key={testimonial.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: idx * 0.1 }}
          whileHover={{ y: -4 }}
          className="group relative"
        >
          {/* Glow on hover */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-secondary/20 via-transparent to-accent/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
          <div className="relative bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-7 hover:border-secondary/30 transition-all duration-500 h-full">
            {/* Rating */}
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <motion.svg
                  key={i}
                  className={`w-4 h-4 ${i < testimonial.rating ? "text-secondary" : "text-white/10"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </motion.svg>
              ))}
            </div>

            {/* Quote icon */}
            <svg
              className="w-6 h-6 text-secondary/30 mb-2"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>

            <p className="text-white/60 text-sm leading-relaxed mb-5 italic">
              "{testimonial.text}"
            </p>

            {/* Author */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-white/40">
                    {testimonial.title} — {testimonial.company}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-secondary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-center rounded-full" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Particle Field ─────────────────────────────────────
function ParticleField({ count = 20 }: { count?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" />
    );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-white/10 blur-[1px]`}
          style={{
            left: `${(i * 19 + 5) % 100}%`,
            top: `${(i * 13 + 11) % 100}%`,
            width: 2 + (i % 3) * 2,
            height: 2 + (i % 3) * 2,
          }}
          animate={{
            y: [0, -20 - (i % 8), 0],
            opacity: [0.1, 0.35, 0.1],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 4 + (i % 4),
            repeat: Infinity,
            ease: "easeInOut",
            delay: (i % 6) * 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ─── UseInView Hook ─────────────────────────────────────
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

// ─── Animated Card Wrapper ──────────────────────────────
function AnimatedCard({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView
          ? "translateY(0) scale(1)"
          : "translateY(40px) scale(0.95)",
        transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Star Rating ────────────────────────────────────────
function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`${sizeClass} ${i < rating ? "text-secondary" : "text-white/20"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Image With Blur Loader ─────────────────────────────
function ProgressiveImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      setLoaded(true);
      return;
    }
    const onLoad = () => setLoaded(true);
    img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-xl transition-opacity duration-700 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        className={`w-full h-full object-cover transition-all duration-700 ${
          loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }`}
      />
    </div>
  );
}

// ─── Portrait Testimonial Card ──────────────────────────
function PortraitCard({
  testimonial,
  index,
}: {
  testimonial: ImageTestimonial;
  index: number;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      className="group relative"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(30px)",
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
      }}
    >
      <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-white/20 hover:border-secondary/40 group">
        {/* Image Container */}
        <div className="relative h-56 sm:h-64 overflow-hidden">
          {/* Shimmer loading effect */}
          {!imgLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]" />
          )}
          <img
            src={testimonial.image}
            alt={testimonial.name}
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Rating badge */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
            <StarRating rating={testimonial.rating} />
          </div>

          {/* Quote icon */}
          <div className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-2 group-hover:translate-x-0">
            <svg
              className="w-4 h-4 text-secondary"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          {/* Name & Title */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-white text-base">
                {testimonial.name}
              </h3>
              <p className="text-xs text-white/60 font-medium">
                {testimonial.title}
              </p>
            </div>
            <div className="sm:hidden">
              <StarRating rating={testimonial.rating} />
            </div>
          </div>

          {/* Testimonial Text */}
          <div className="relative">
            <svg
              className="absolute -top-1 -left-1 w-5 h-5 text-secondary/20 -z-0"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <p className="text-sm text-white/70 leading-relaxed italic relative z-10 pl-4">
              "{testimonial.text}"
            </p>
          </div>
        </div>

        {/* Bottom accent bar on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-accent to-secondary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      </div>
    </div>
  );
}

// ─── Screenshot Card ────────────────────────────────────
function ScreenshotCard({
  src,
  alt,
  index,
  onClick,
}: {
  src: string;
  alt: string;
  index: number;
  onClick: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      className="break-inside-avoid mb-5"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(index * 0.05, 0.4)}s`,
      }}
    >
      <button
        onClick={onClick}
        className="group relative w-full rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-2"
      >
        {/* Shimmer loading */}
        {!imgLoaded && (
          <div className="w-full aspect-[3/4] bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]" />
        )}

        {/* Image */}
        <div
          className={`relative overflow-hidden ${imgLoaded ? "block" : "hidden"}`}
        >
          <img
            src={src}
            alt={alt}
            onLoad={() => setImgLoaded(true)}
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span className="text-white text-xs font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                View Full Size
              </span>
              <span className="text-white bg-black/40 backdrop-blur-sm p-1.5 rounded-full">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>

        {/* Image number badge */}
        <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          #{index + 1}
        </div>
      </button>
    </div>
  );
}

// ─── Lightbox Modal ─────────────────────────────────────
function LightboxModal({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: {
  images: { src: string; alt: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  const current = images[currentIndex];
  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* Image */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.src}
          alt={current.alt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      </motion.div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation(); /* handled by parent via callback */
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "bg-white w-4"
                  : "bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Image Testimonials Section (Advanced) ──────────────
function ImageTestimonialsSection() {
  const [activeCategory, setActiveCategory] = useState<
    "portraits" | "screenshots"
  >("portraits");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Portrait Testimonials Data ──
  const portraitTestimonials: ImageTestimonial[] = [
    {
      id: "portrait-1",
      name: "Mia Carter",
      title: "Content Creator",
      text: "Adonay's personal branding course completely changed how I approach TikTok. I went from 200 to 50K followers in just 3 months. The storytelling techniques are pure gold!",
      image: "/testimonial/image%201.jpeg",
      rating: 5,
    },
    {
      id: "portrait-2",
      name: "Ethan Davis",
      title: "Aspiring Creator",
      text: "I was stuck at 1,000 followers for months until I took Adonay's course. His strategies on viral content and audience psychology helped me hit my first million views!",
      image: "/testimonial/image%202.jpeg",
      rating: 5,
    },
    {
      id: "portrait-3",
      name: "Olivia Kim",
      title: "Digital Marketer",
      text: "Adonay taught me how to build a personal brand that actually connects with people. His camera confidence tips alone transformed my content quality overnight.",
      image: "/testimonial/image%203.jpeg",
      rating: 5,
    },
    {
      id: "portrait-4",
      name: "Noah Wilson",
      title: "Entrepreneur",
      text: "The monetization strategies Adonay shared opened my eyes. I'm now earning consistently from my content thanks to his proven systems and step-by-step guidance.",
      image: "/testimonial/image%204.jpeg",
      rating: 5,
    },
    {
      id: "portrait-5",
      name: "Sophia Turner",
      title: "Full-Time Creator",
      text: "Adonay doesn't just teach theory — he shows you what actually works. His insights on storytelling and digital influence helped me grow my account to 200K followers.",
      image: "/testimonial/image%205.jpeg",
      rating: 5,
    },
  ];

  // ── Screenshot Testimonials Data ──
  const screenshotImages = [
    { src: "/testimonial/6.jpeg", alt: "Student testimonial screenshot 1" },
    { src: "/testimonial/7.jpeg", alt: "Student testimonial screenshot 2" },
    { src: "/testimonial/8.jpeg", alt: "Student testimonial screenshot 3" },
    { src: "/testimonial/9.jpeg", alt: "Student testimonial screenshot 4" },
    { src: "/testimonial/10.jpeg", alt: "Student testimonial screenshot 5" },
    { src: "/testimonial/11.jpeg", alt: "Student testimonial screenshot 6" },
    { src: "/testimonial/12.jpeg", alt: "Student testimonial screenshot 7" },
    { src: "/testimonial/13.jpeg", alt: "Student testimonial screenshot 8" },
    { src: "/testimonial/14.jpeg", alt: "Student testimonial screenshot 9" },
    { src: "/testimonial/15.jpeg", alt: "Student testimonial screenshot 10" },
    { src: "/testimonial/16.jpeg", alt: "Student testimonial screenshot 11" },
    { src: "/testimonial/17.jpeg", alt: "Student testimonial screenshot 12" },
    { src: "/testimonial/18.jpeg", alt: "Student testimonial screenshot 13" },
  ];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const goToPrev = () => {
    setLightboxIndex((prev) =>
      prev === 0 ? screenshotImages.length - 1 : prev - 1,
    );
  };

  const goToNext = () => {
    setLightboxIndex((prev) =>
      prev === screenshotImages.length - 1 ? 0 : prev + 1,
    );
  };

  return (
    <div>
      {/* ── Category Switcher ── */}
      <div className="flex items-center gap-2 mb-8 bg-white/10 backdrop-blur-sm rounded-xl p-1.5 border border-white/20 max-w-xs mx-auto sm:mx-0">
        {[
          {
            id: "portraits" as const,
            label: "Portrait",
            icon: "👤",
            count: portraitTestimonials.length,
          },
          {
            id: "screenshots" as const,
            label: "Screenshots",
            icon: "📱",
            count: screenshotImages.length,
          },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeCategory === cat.id
                ? "bg-gradient-to-r from-primary to-primary-light text-white shadow-md"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeCategory === cat.id
                  ? "bg-white/20 text-white"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Portrait Grid ── */}
      {activeCategory === "portraits" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {portraitTestimonials.map((t, i) => (
            <PortraitCard key={t.id} testimonial={t} index={i} />
          ))}
        </div>
      )}

      {/* ── Screenshot Masonry ── */}
      {activeCategory === "screenshots" && (
        <>
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-0">
            {screenshotImages.map((img, i) => (
              <ScreenshotCard
                key={i}
                src={img.src}
                alt={img.alt}
                index={i}
                onClick={() => openLightbox(i)}
              />
            ))}
          </div>

          {/* View all badge */}
          <AnimatedCard delay={0.3} className="text-center mt-8">
            <p className="text-sm text-white/60 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/20">
              <svg
                className="w-4 h-4 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {screenshotImages.length} real student testimonials
              <span className="text-secondary font-semibold">
                — Click any to view full size
              </span>
            </p>
          </AnimatedCard>
        </>
      )}

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <LightboxModal
            images={screenshotImages}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onPrev={goToPrev}
            onNext={goToNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Testimonials Page
import { motion, AnimatePresence } from "framer-motion";

export default function TestimonialsPage() {
  const [activeTab, setActiveTab] = useState<"video" | "text" | "image">(
    "video",
  );

  const tabs = [
    { id: "video" as const, label: "Video Testimonials", icon: "🎥" },
    { id: "text" as const, label: "Text Testimonials", icon: "💬" },
    { id: "image" as const, label: "Image Testimonials", icon: "🖼️" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary-dark to-primary">
      {/* Hero Banner */}
      <section className="relative overflow-hidden">
        {/* Particles & Orbs */}
        <ParticleField count={25} />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-secondary/10 to-accent/5 blur-3xl animate-orb" />
          <motion.div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-secondary/10 to-transparent blur-3xl animate-orb-slow" />
          <motion.div className="absolute top-1/4 right-1/4 w-20 h-20 rounded-full border border-secondary/10 animate-spin-slow" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-secondary/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-secondary/30 text-white/70 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_6px_rgba(201,149,42,0.6)]" />
                Real Results from Real Students
              </span>
            </motion.div>
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Student{" "}
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                Testimonials
              </span>
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-white/70 mb-8 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Hear from real creators who transformed their presence with Adonay
              TikTok Academy. From zero followers to millions — discover how our
              students built their personal brands and mastered TikTok growth.
            </motion.p>
            <motion.div
              className="flex justify-center items-center gap-4 sm:gap-8 flex-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-lg">
                  6M+
                </div>
                <div className="text-xs sm:text-sm text-white/50 mt-1">
                  followers built
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-lg">
                  1.3B+
                </div>
                <div className="text-xs sm:text-sm text-white/50 mt-1">
                  views generated
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-lg">
                  1,000+
                </div>
                <div className="text-xs sm:text-sm text-white/50 mt-1">
                  students trained
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-lg">
                  🏆 2025
                </div>
                <div className="text-xs sm:text-sm text-white/50 mt-1">
                  TikToker of the Year
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-primary-dark to-transparent" />
      </section>

      {/* Tab Navigation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center gap-3 flex-wrap">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? "text-white shadow-lg"
                  : "bg-white/10 backdrop-blur-sm text-white/70 border border-white/20 hover:bg-white/20 hover:text-white"
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {activeTab === tab.id && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Content Sections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === "video" && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
                <span className="w-1.5 h-8 bg-gradient-to-b from-secondary to-accent rounded-full inline-block" />
                Video Testimonials
              </h2>
              <VideoTestimonialsSection />
            </motion.div>
          )}

          {activeTab === "text" && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
                <span className="w-1.5 h-8 bg-gradient-to-b from-secondary to-accent rounded-full inline-block" />
                Text Testimonials
              </h2>
              <TextTestimonialsSection />
            </motion.div>
          )}

          {activeTab === "image" && (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
                <span className="w-1.5 h-8 bg-gradient-to-b from-secondary to-accent rounded-full inline-block" />
                Image Testimonials
              </h2>
              <ImageTestimonialsSection />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
