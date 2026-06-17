import Link from "next/link";
import CloudinaryService from "@/lib/cloudinary";

async function getCloudinaryPromo() {
  try {
    const allVideos = await CloudinaryService.searchResources(
      "resource_type:video",
      { maxResults: 1, resourceType: "video" },
    );

    if (allVideos.length === 0) return null;

    const promoVideo = allVideos[0];
    return {
      url: promoVideo.secure_url,
      streamingUrl: CloudinaryService.getStreamingUrl(promoVideo.public_id),
      thumbnail: CloudinaryService.getVideoThumbnail(promoVideo.public_id, {
        width: 1280,
        height: 720,
      }),
      publicId: promoVideo.public_id,
      title: promoVideo.public_id?.split("/").pop() || "Promo Video",
    };
  } catch (error) {
    console.error("[HOME] Failed to fetch Cloudinary video:", error);
    return null;
  }
}

export default async function Home() {
  const promo = await getCloudinaryPromo();

  return (
    <div>
      {/* Hero - Video Section */}
      <section className="bg-gradient-to-br from-[#00BCD4] via-[#0097A7] to-[#FF1744] text-white min-h-[calc(100vh-4rem)] flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col items-center gap-8 lg:gap-10">
            <div className="text-center max-w-3xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4">
                በአዲስ መልኩ መማር ይጀምሩ
              </h1>
              <p className="text-base sm:text-lg text-white/90 mb-8 max-w-lg mx-auto">
                AD LMS ለሁሉም ሰው ተደራሽ የሆነ ዘመናዊ የመስመር ላይ ትምህርት መድረክ ነው። በቀላሉ ይማሩ፣
                ዕውቀትዎን ያሳድጉ።
              </p>
            </div>

            {/* Video Player - Cloudinary */}
            <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl bg-black ring-4 ring-white/20">
              {promo ? (
                <video
                  className="w-full aspect-video"
                  controls
                  playsInline
                  poster={promo.thumbnail}
                >
                  <source src={promo.url} type="video/mp4" />
                  የእርስዎ ብራውዘር ቪዲዮ ማጫወት አይደግፍም።
                </video>
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400">
                  <div className="text-center p-8">
                    <svg
                      className="w-16 h-16 mx-auto mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-lg">የማስተዋወቂያ ቪዲዮ እየተጫነ ነው...</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Promo video loading...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Buttons below video */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-2 w-full max-w-md mx-auto">
              <Link
                href="/auth/register"
                className="bg-white text-[#00BCD4] px-8 py-3.5 rounded-lg text-center font-semibold hover:bg-[#F0FEFF] transition-all shadow-lg hover:shadow-xl sm:flex-1"
              >
                አሁን ይመዝገቡ
              </Link>
              <Link
                href="/courses"
                className="bg-[#FF1744] text-white px-8 py-3.5 rounded-lg text-center font-semibold hover:bg-[#FF3366] transition-all shadow-lg hover:shadow-xl sm:flex-1"
              >
                ኮርሶችን ይመልከቱ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
