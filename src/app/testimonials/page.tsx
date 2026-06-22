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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-2/3 rounded bg-gray-100" />
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
        <p className="text-gray-500">
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
            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border-light hover:border-primary cursor-pointer"
            onClick={() => setSelectedVideo(testimonial)}
          >
            <div className="relative h-48 bg-gradient-to-br from-primary to-secondary overflow-hidden">
              <video
                src={testimonial.videoUrl}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <button className="bg-white/90 hover:bg-white text-[#1b2a4a] p-3 rounded-full transition-all transform group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#1b2a4a]/20">
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
              <h3 className="font-bold text-primary mb-1">
                {testimonial.name}
              </h3>
              <p className="text-sm text-text-muted mb-3">
                {testimonial.title}
              </p>
              <p className="text-xs text-primary font-medium">Watch now</p>
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
              <p className="text-gray-300 text-sm">
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
        title: "Marketing Specialist",
        company: "Bright Media",
        text: "AD LMS helped me improve my skills and land the job I wanted. The course content was clear, practical, and easy to follow.",
        rating: 5,
      },
      {
        id: "txt-2",
        name: "Liam Patel",
        title: "Product Designer",
        company: "Creative Studio",
        text: "The platform is easy to use and the instructors are knowledgeable. Highly recommended for anyone learning online.",
        rating: 5,
      },
      {
        id: "txt-3",
        name: "Sophia Lee",
        title: "Software Engineer",
        company: "Tech Works",
        text: "The lessons are practical and the support team was always available. I feel more confident in my career after completing the course.",
        rating: 4,
      },
      {
        id: "txt-4",
        name: "Noah Brown",
        title: "Business Analyst",
        company: "Growth Labs",
        text: "Amazing experience! The courses are well-structured and the community support is excellent.",
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
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse space-y-4"
          >
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {textTestimonials.map((testimonial) => (
        <div
          key={testimonial.id}
          className="group bg-gradient-to-br from-white to-surface rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-border-light hover:border-primary"
        >
          <div className="flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${i < testimonial.rating ? "text-secondary" : "text-gray-300"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-text-muted text-sm leading-relaxed mb-4 italic">
            "{testimonial.text}"
          </p>
          <div className="border-t border-border-light pt-4">
            <p className="font-semibold text-primary">{testimonial.name}</p>
            <p className="text-xs text-primary font-medium">
              {testimonial.title}
            </p>
            <p className="text-xs text-text-muted">{testimonial.company}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Image Testimonials Section
function ImageTestimonialsSection() {
  const [imageTestimonials, setImageTestimonials] = useState<
    ImageTestimonial[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testimonials: ImageTestimonial[] = [
      {
        id: "img-1",
        name: "Mia Carter",
        title: "Freelance Writer",
        text: "AD LMS helped me master new skills quickly and effectively. I loved the hands-on lessons and course structure.",
        image:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
        rating: 5,
      },
      {
        id: "img-2",
        name: "Ethan Davis",
        title: "Visual Designer",
        text: "Great learning experience with real results. I now feel more confident building projects from start to finish.",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
        rating: 5,
      },
      {
        id: "img-3",
        name: "Olivia Kim",
        title: "Project Manager",
        text: "The lessons were easy to follow and the projects were meaningful. This course helped me move ahead in my career.",
        image:
          "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop",
        rating: 4,
      },
      {
        id: "img-4",
        name: "Noah Wilson",
        title: "Entrepreneur",
        text: "I loved how the platform made learning engaging and practical. The content was useful from day one.",
        image:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
        rating: 5,
      },
      {
        id: "img-5",
        name: "Sophia Turner",
        title: "UX Researcher",
        text: "The instructors are supportive and the course material is excellent. I highly recommend AD LMS to anyone learning online.",
        image:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
        rating: 5,
      },
      {
        id: "img-6",
        name: "Lucas Martin",
        title: "Software Developer",
        text: "AD LMS made it easy to study on my schedule. The lessons were practical and helped me grow my skills fast.",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
        rating: 4,
      },
    ];
    setImageTestimonials(testimonials);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {imageTestimonials.map((testimonial) => (
        <div
          key={testimonial.id}
          className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border-light hover:border-primary"
        >
          <div className="relative h-64 bg-gradient-to-br from-primary to-secondary overflow-hidden">
            <img
              src={testimonial.image}
              alt={testimonial.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="p-5">
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-3 h-3 ${i < testimonial.rating ? "text-secondary" : "text-gray-300"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-sm text-text-muted line-clamp-3 mb-3 italic">
              "{testimonial.text}"
            </p>
            <div className="border-t border-border-light pt-3">
              <p className="font-bold text-primary text-sm">
                {testimonial.name}
              </p>
              <p className="text-xs text-primary font-medium">
                {testimonial.title}
              </p>
            </div>
          </div>
        </div>
      ))}
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
    <div className="min-h-screen bg-surface dark:bg-gray-900">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-primary via-primary-light to-secondary overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-secondary/10 blur-3xl"
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Student Testimonials
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-white/90 mb-8 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Learn from real students who grew their skills and careers with AD
              LMS. Explore video, text, and image testimonials from our
              community.
            </motion.p>
            <motion.div
              className="flex justify-center items-center gap-4 flex-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  10,000+
                </div>
                <div className="text-xs sm:text-sm text-white/80 mt-1">
                  happy learners
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  4.9★
                </div>
                <div className="text-xs sm:text-sm text-white/80 mt-1">
                  average rating
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  1,500+
                </div>
                <div className="text-xs sm:text-sm text-white/80 mt-1">
                  certificates earned
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent" />
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
                  : "bg-white dark:bg-gray-800 text-primary dark:text-gray-200 border-2 border-border-light dark:border-gray-700 hover:border-primary"
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
              <h2 className="text-2xl font-bold text-primary dark:text-gray-100 mb-8 flex items-center gap-2">
                <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
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
              <h2 className="text-2xl font-bold text-primary dark:text-gray-100 mb-8 flex items-center gap-2">
                <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
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
              <h2 className="text-2xl font-bold text-primary dark:text-gray-100 mb-8 flex items-center gap-2">
                <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
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
