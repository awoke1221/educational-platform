"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface VideoTestimonial {
  id: string;
  name: string;
  title: string;
  videoUrl: string;
  cloudinaryPublicId: string;
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
    // Hardcoded video testimonials using Cloudinary
    const testimonials: VideoTestimonial[] = [
      {
        id: "vid-1",
        name: "አቤቤ ተሐነ",
        title: "ሶፍትዌር ፕሮግራመር",
        videoUrl:
          "https://res.cloudinary.com/dikm1x43c/video/upload/v1/samples/sea-turtle",
        cloudinaryPublicId: "samples/sea-turtle",
        duration: 45,
      },
      {
        id: "vid-2",
        name: "ሙሉነሽ አሰፋ",
        title: "ዲዲታል ማርኬቲንግ ስፔሻሊስት",
        videoUrl:
          "https://res.cloudinary.com/dikm1x43c/video/upload/v1/samples/elephants",
        cloudinaryPublicId: "samples/elephants",
        duration: 60,
      },
      {
        id: "vid-3",
        name: "ብርሃነ ታደሰ",
        title: "ሞባይል ጀማሪ ሚኒስተር",
        videoUrl:
          "https://res.cloudinary.com/dikm1x43c/video/upload/v1/samples/sea-turtle",
        cloudinaryPublicId: "samples/sea-turtle",
        duration: 45,
      },
    ];
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
                poster={`https://res.cloudinary.com/dikm1x43c/video/upload/c_fill,h_192,q_auto,w_340,so_0s/${testimonial.cloudinaryPublicId}.jpg`}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <button className="bg-white/90 hover:bg-white text-secondary p-3 rounded-full transition-all transform group-hover:scale-110">
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
              <p className="text-xs text-primary font-medium">ቪዲዮ ምስክርነት</p>
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
                ይህ ምስክር በእኛ ተማሪ ሰብስቦ ሞያ ምንብርከታ እና ሃላፊነት ስለ AD LMS ያሳያል።
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
                ዝጋ
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
        name: "ብርሃነ ታደሰ",
        title: "ኮርሱ ተማሪ",
        company: "ጌታ ሶፍትዌር",
        text: "AD LMS ኮርሱ ገና ንግግር ስስተም ምክር አልወደደ ነበር ግን አሁን ሙሉ ለሙሉ ተለውጧል! በጣም ጥሩ ኮርስ ነው።",
        rating: 5,
      },
      {
        id: "txt-2",
        name: "ሳልም ሙሊታ",
        title: "ይህ ብርሃን ወጋ",
        company: "ኢሜ ቴክ",
        text: "ከ AD LMS ጋር ተማር አድርጋለሁ እና ሙሉ ለሙሉ ተስፋ ወደ ሌላ ሥራ መሄድ ችሌያለሁ ። አመስጋናለሁ!",
        rating: 5,
      },
      {
        id: "txt-3",
        name: "ዘሪአ ተስፋዬ",
        title: "ዲዲታል ማርኬቲንግ ስፔሻሊስት",
        company: "ነብር ዲጂታል",
        text: "ይህ ግን በጣም ጥሩ የተማሪ ገበያ። ሁሉም ኮርስ በጣም ተስማሚ እና ጠቃሚ ነው።",
        rating: 4,
      },
      {
        id: "txt-4",
        name: "ከበደ ታደሰ",
        title: "ዉጤት ሁኔታ",
        company: "ደርሰት ኢንኖቬሽን",
        text: "AD LMS ከሌሎች ኮርስ ፕላቶርም የተለየ ነው። ሙሉ ለሙሉ የታዘበ።",
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
        name: "ሓና ሳረ",
        title: "ጨዋ ሙያ ሰራተኛ",
        text: "AD LMS በእኔ ስራ አመራት ተለውጠ። እጅግ በጣም ምርጥ ልምድ ነበር!",
        image:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
        rating: 5,
      },
      {
        id: "img-2",
        name: "ዓላ በየነ",
        title: "ቴክኖሎጂ ሰራተኛ",
        text: "በጣም ጥሩ ሙያ ዝርጋት! ሞባይል ዲቬሎፕመንት ለመምጣት እረጅ ከረ።",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
        rating: 5,
      },
      {
        id: "img-3",
        name: "ሚሪያም ታደሰ",
        title: "ምህረተ ሙያ ሴት",
        text: "ብዙ ተማሪ ጋር ተራምድ ሁሉ በድንቁርና ጋር ተብሎ ይሄዳል።",
        image:
          "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop",
        rating: 4,
      },
      {
        id: "img-4",
        name: "ወናዥ ምሩ",
        title: "ዋና ቴክኖሎጂ ሰራተኛ",
        text: "AD LMS በእኔ ስራ ዘርዝር ተለውጥ ። ሙሉ ለሙሉ አዲስ ተሞክሮ!",
        image:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
        rating: 5,
      },
      {
        id: "img-5",
        name: "ሊና ከበደ",
        title: "ሸ ውጤት ሴት",
        text: "ይህ ብቻ ሙያ ስልት ደስ ይልኛል። ቀጣይ ኮርሱን ብቸኛ በይወ ታሪ ነው።",
        image:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
        rating: 5,
      },
      {
        id: "img-6",
        name: "ምቴ ወንዴ",
        title: "ወህግደ ሙያ ሰራተኛ",
        text: "AD LMS ሞያወ ልወር ወርህ አላ ሁሉ ነገር በግልጽ ተብራርቷል።",
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
export default function TestimonialsPage() {
  const [activeTab, setActiveTab] = useState<"video" | "text" | "image">(
    "video",
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Banner */}
      <section className="relative bg-gradient-to-br from-primary via-primary-light to-secondary overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
              ምስክርነቶች
            </h1>
            <p className="text-base sm:text-lg text-white/90 mb-8 max-w-xl mx-auto">
              ከአሰሙ ተማሪዎቻቻችን መምጣት ውጤታቸውና ሞግገሱን ቀጣይ ለማወቅ
            </p>
            <div className="flex justify-center items-center gap-4 flex-wrap">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  10,000+
                </div>
                <div className="text-xs sm:text-sm text-white/80 mt-1">
                  ደስተኞች ተማሪዎች
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  4.9★
                </div>
                <div className="text-xs sm:text-sm text-white/80 mt-1">
                  አርሞት ደረጃ
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  1,500+
                </div>
                <div className="text-xs sm:text-sm text-white/80 mt-1">
                  ሥራ ወሳኝ ዋጋ
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent" />
      </section>

      {/* Tab Navigation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center gap-3 flex-wrap">
          {[
            { id: "video", label: "ቪዲዮ ምስክርነቶች", icon: "🎬" },
            { id: "text", label: "ጽሑፍ ምስክርነቶች", icon: "💬" },
            { id: "image", label: "ምስል ምስክርነቶች", icon: "📸" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
                  : "bg-white text-primary border-2 border-border-light hover:border-primary"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Content Sections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {activeTab === "video" && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold text-primary mb-8 flex items-center gap-2">
              <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
              ቪዲዮ ምስክርነቶች
            </h2>
            <VideoTestimonialsSection />
          </div>
        )}

        {activeTab === "text" && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold text-primary mb-8 flex items-center gap-2">
              <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
              ጽሑፍ ምስክርነቶች
            </h2>
            <TextTestimonialsSection />
          </div>
        )}

        {activeTab === "image" && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold text-primary mb-8 flex items-center gap-2">
              <span className="w-1.5 h-8 bg-gradient-to-b from-primary to-secondary rounded-full inline-block" />
              ምስል ምስክርነቶች
            </h2>
            <ImageTestimonialsSection />
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-secondary py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            ወደ ምስክርነት ታሪክ ዶ?
          </h2>
          <p className="text-white/90 mb-8">
            በ AD LMS ከ ሌላ ሰፊ ተማሪ ቅጥ ጋር በተለውጡ ተርገምና የሞያ ብለግባ
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 bg-white text-secondary px-8 py-3.5 rounded-full font-semibold hover:shadow-lg transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            ኮርሱን ይመልከቱ
          </Link>
        </div>
      </section>

      {/* Footer Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: "ወደ ተሎ ተማሪዎች", value: "10,000+" },
            { label: "አጠናቀቁ ኮርስ", value: "50,000+" },
            { label: "አማካይ ደረጃ", value: "4.9 ⭐" },
            { label: "ሥራ ምልክት ተሰጥቶ", value: "1,500+" },
          ].map((stat, i) => (
            <div
              key={i}
              className="text-center p-6 rounded-xl bg-gradient-to-br from-border-light to-accent-light border border-primary/20"
            >
              <p className="text-text-muted text-sm mb-2">{stat.label}</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
