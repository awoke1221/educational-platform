"use client";

import { useRef, useEffect } from "react";
import Hls from "hls.js";

interface SampleVideo {
  url: string;
  thumbnail: string;
  streamingUrl: string;
  publicId: string;
  title: string;
  duration: number;
}

/** Individual sample video card with HLS.js support */
function SampleVideoCard({ video }: { video: SampleVideo }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video.url) return;

    const isHls =
      video.url.includes(".m3u8") || video.url.includes("playlist.m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(video.url);
      hls.attachMedia(el);
      hlsRef.current = hls;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.url]);

  return (
    <div className="relative aspect-video bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        poster={video.thumbnail}
        preload="metadata"
        muted
        playsInline
        onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
        onMouseLeave={(e) => (e.currentTarget as HTMLVideoElement).pause()}
      />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
        <div className="w-12 h-12 bg-secondary/90 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white ml-0.5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
        {video.duration > 0 ? `${video.duration}s` : ""}
      </div>
    </div>
  );
}

export default function SampleVideoGallery({
  samples,
}: {
  samples: SampleVideo[];
}) {
  if (samples.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-primary mb-2">
          የናሙና ቪዲዮዎች
        </h2>
        <p className="text-gray-500 text-center text-sm mb-10">
          ከእኛ የመማሪያ ቪዲዮዎች ናሙና ይመልከቱ
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {samples.map((video, index) => (
            <div
              key={index}
              className="bg-surface rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
            >
              <SampleVideoCard video={video} />
              <div className="p-3">
                <h3 className="font-medium text-sm text-gray-800 truncate">
                  {video.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
