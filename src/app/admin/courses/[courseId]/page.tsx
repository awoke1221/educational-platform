"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ============================================
// Types
// ============================================

interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription: string | null;
  coverImage: string;
  price: string;
  level: string;
  category: string | null;
  isPublished: boolean;
  isArchived: boolean;
  videoCount: number;
  enrollmentCount: number;
  duration: number | null;
  instructor: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  orderIndex: number;
  isPublished: boolean;
  videoUrl: string | null;
  cloudinaryPublicId: string | null;
  videoSize: string | null;
  views: number;
  createdAt: string;
}

// ============================================
// Upload State Interface
// ============================================

interface UploadState {
  isUploading: boolean;
  progress: number;
  lectureId: string | null;
  error: string | null;
}

// ============================================
// Helper: Format file size
// ============================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ============================================
// Main Admin Course Detail Page
// ============================================

export default function AdminCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  // Auth & Data
  const [token, setToken] = useState("");
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lectures" | "settings">(
    "lectures",
  );

  // Lecture Creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLectureTitle, setNewLectureTitle] = useState("");
  const [newLectureDesc, setNewLectureDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Video Upload
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    lectureId: null,
    error: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // Auth Check
  // ============================================

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/auth/login");
      return;
    }
    setToken(t);
  }, [router]);

  // ============================================
  // Fetch Course & Lectures
  // ============================================

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;
    setLoading(true);

    try {
      const [courseRes, lecturesRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/courses/${courseId}/lectures`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const courseData = await courseRes.json();
      if (courseData.success) {
        setCourse(courseData.data);
      }

      const lecturesData = await lecturesRes.json();
      if (lecturesData.success) {
        setLectures(lecturesData.data.lectures || []);
      }
    } catch (err) {
      console.error("[ADMIN COURSE] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [token, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // Create Lecture
  // ============================================

  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newLectureTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/lectures`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newLectureTitle.trim(),
          description: newLectureDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewLectureTitle("");
        setNewLectureDesc("");
        setShowCreateForm(false);
        fetchData();
      }
    } catch (err) {
      console.error("[ADMIN COURSE] Create lecture error:", err);
    } finally {
      setCreating(false);
    }
  };

  // ============================================
  // Upload Video to Cloudinary
  // ============================================

  const handleUploadVideo = async (lectureId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm,video/ogg";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate
      const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
      if (file.size > maxSize) {
        setUploadState({
          isUploading: false,
          progress: 0,
          lectureId: null,
          error: "ቪዲዮው በጣም ትልቅ ነው። ከፍተኛው 5GB ነው።",
        });
        return;
      }

      if (!["video/mp4", "video/webm", "video/ogg"].includes(file.type)) {
        setUploadState({
          isUploading: false,
          progress: 0,
          lectureId: null,
          error: "የተፈቀዱ ቅርፀቶች MP4, WebM, OGG ብቻ ናቸው።",
        });
        return;
      }

      setUploadState({
        isUploading: true,
        progress: 0,
        lectureId,
        error: null,
      });

      try {
        // Upload via the API route
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "video");

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadState((prev) => ({ ...prev, progress: pct }));
          }
        };

        const uploadResult = await new Promise<any>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error("Invalid response"));
              }
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.error || "Upload failed"));
              } catch {
                reject(new Error("Upload failed"));
              }
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.onabort = () => reject(new Error("Upload cancelled"));

          xhr.open("POST", `/api/upload`, true);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Upload failed");
        }

        const { publicId, url, duration } = uploadResult.data;

        // Now attach the video to the lecture
        const attachRes = await fetch(
          `/api/courses/${courseId}/lectures/${lectureId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "video",
              videoUrl: url,
              cloudinaryPublicId: publicId,
              duration: Math.round(duration || 0),
              videoSize: file.size,
            }),
          },
        );

        const attachData = await attachRes.json();
        if (!attachData.success) {
          throw new Error(attachData.error || "Failed to attach video");
        }

        // Success
        setUploadState({
          isUploading: false,
          progress: 100,
          lectureId,
          error: null,
        });

        fetchData();

        // Reset after 3 seconds
        setTimeout(() => {
          setUploadState({
            isUploading: false,
            progress: 0,
            lectureId: null,
            error: null,
          });
        }, 3000);
      } catch (err: any) {
        setUploadState({
          isUploading: false,
          progress: 0,
          lectureId,
          error: err.message || "Upload failed",
        });
      }
    };
    input.click();
  };

  // ============================================
  // Delete Lecture
  // ============================================

  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm("እርግጠኛ ነዎት? ይህ ምዕራፍ ይደመሰሳል።")) return;

    try {
      const res = await fetch(
        `/api/courses/${courseId}/lectures/${lectureId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error("[ADMIN COURSE] Delete error:", err);
    }
  };

  // ============================================
  // Loading State
  // ============================================

  if (!token) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">በመጫን ላይ...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 mb-4">ኮርስ አልተገኘም</p>
        <Link
          href="/admin/courses"
          className="text-[#1B2A4A] hover:underline text-sm"
        >
          ← ወደ ኮርሶች ዝርዝር
        </Link>
      </div>
    );
  }

  // ============================================
  // Helpers
  // ============================================

  const levelLabels: Record<string, string> = {
    beginner: "ጀማሪ",
    intermediate: "መካከለኛ",
    advanced: "ከፍተኛ",
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/courses"
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-[#1B2A4A]">
              {course.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-7">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                course.isPublished
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {course.isPublished ? "የታተመ" : "ረቂቅ"}
            </span>
            <span className="text-xs text-gray-400">
              {course.instructor?.fullName || "ያልታወቀ አስተማሪ"}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">
              {levelLabels[course.level] || course.level}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">
              {Number(course.price).toLocaleString()} ብር
            </span>
          </div>
        </div>
        <Link
          href={`/courses/${courseId}`}
          className="text-sm text-[#1B2A4A] hover:underline"
          target="_blank"
        >
          ክፈት →
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("lectures")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "lectures"
              ? "border-[#C9952A] text-[#1B2A4A]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          ምዕራፎች ({lectures.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-[#C9952A] text-[#1B2A4A]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          ቅንብሮች
        </button>
      </div>

      {/* ============================================ */}
      {/* LECTURES TAB */}
      {/* ============================================ */}
      {activeTab === "lectures" && (
        <div>
          {/* Add Lecture Button */}
          <div className="mb-6">
            {showCreateForm ? (
              <form
                onSubmit={handleCreateLecture}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4"
              >
                <h3 className="font-semibold text-gray-900">አዲስ ምዕራፍ ይፍጠሩ</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    የምዕራፍ ርዕስ *
                  </label>
                  <input
                    type="text"
                    value={newLectureTitle}
                    onChange={(e) => setNewLectureTitle(e.target.value)}
                    placeholder="ለምሳሌ፡ መግቢያ እና መሰረታዊ ፅንሰ ሀሳቦች"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    መግለጫ (አማራጭ)
                  </label>
                  <textarea
                    value={newLectureDesc}
                    onChange={(e) => setNewLectureDesc(e.target.value)}
                    placeholder="ስለ ምዕራፉ አጭር መግለጫ..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ሰርዝ
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newLectureTitle.trim()}
                    className="px-5 py-2 bg-[#1B2A4A] text-white text-sm font-medium rounded-lg hover:bg-[#2C3E6B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        በመፍጠር ላይ...
                      </span>
                    ) : (
                      "ምዕራፍ ፍጠር"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-[#C9952A] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#b8862a] transition-colors"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                አዲስ ምዕራፍ ጨምር
              </button>
            )}
          </div>

          {/* Lectures List */}
          <div className="space-y-3">
            {lectures.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <svg
                  className="w-12 h-12 text-gray-300 mx-auto mb-3"
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
                <p className="text-gray-500 text-sm mb-1">ምንም ምዕራፎች የሉም</p>
                <p className="text-gray-400 text-xs">
                  ከላይ ያለውን ቁልፍ ተጭነው የመጀመሪያውን ምዕራፍ ይፍጠሩ
                </p>
              </div>
            ) : (
              lectures
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((lecture, index) => {
                  const isUploading =
                    uploadState.isUploading &&
                    uploadState.lectureId === lecture.id;
                  const isUploaded =
                    !uploadState.isUploading &&
                    uploadState.progress === 100 &&
                    uploadState.lectureId === lecture.id;
                  const hasError =
                    uploadState.error && uploadState.lectureId === lecture.id;

                  return (
                    <div
                      key={lecture.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          {/* Lecture Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 bg-[#1B2A4A] text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                                {index + 1}
                              </span>
                              <h3 className="font-semibold text-gray-900 text-sm truncate">
                                {lecture.title}
                              </h3>
                              {lecture.isPublished ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                                  ታትሟል
                                </span>
                              ) : (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">
                                  ረቂቅ
                                </span>
                              )}
                            </div>

                            {lecture.description && (
                              <p className="text-xs text-gray-500 mt-1.5 ml-9 line-clamp-2">
                                {lecture.description}
                              </p>
                            )}

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 ml-9">
                              <span className="text-xs text-gray-400">
                                {lecture.duration
                                  ? `${lecture.duration} ደቂቃ`
                                  : "ቆይታ የለም"}
                              </span>
                              {lecture.cloudinaryPublicId && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  ቪዲዮ ተጭኗል
                                </span>
                              )}
                              {lecture.videoSize && (
                                <span className="text-xs text-gray-400">
                                  {formatFileSize(Number(lecture.videoSize))}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {lecture.views} እይታዎች
                              </span>
                            </div>

                            {/* Upload Progress */}
                            {isUploading && (
                              <div className="mt-3 ml-9">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-[#C9952A] font-medium">
                                    ቪዲዮ እየጫነ ነው...
                                  </span>
                                  <span className="text-gray-500">
                                    {uploadState.progress}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                  <div
                                    className="bg-[#C9952A] h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${uploadState.progress}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Upload Error */}
                            {hasError && (
                              <div className="mt-2 ml-9 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                {uploadState.error}
                              </div>
                            )}

                            {/* Uploaded Success */}
                            {isUploaded && (
                              <div className="mt-2 ml-9 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-1">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                ቪዲዮ በተሳካ ሁኔታ ተጭኗል!
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Upload Video Button */}
                            <button
                              onClick={() => handleUploadVideo(lecture.id)}
                              disabled={uploadState.isUploading}
                              className={`p-2 rounded-lg transition-colors ${
                                lecture.cloudinaryPublicId
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-gray-400 hover:bg-gray-100 hover:text-[#1B2A4A]"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={
                                lecture.cloudinaryPublicId
                                  ? "ቪዲዮ ቀይር"
                                  : "ቪዲዮ ጫን"
                              }
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
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>

                            {/* Preview Button (if video exists) */}
                            {lecture.cloudinaryPublicId && (
                              <Link
                                href={`/courses/${courseId}/lectures/${lecture.id}`}
                                target="_blank"
                                className="p-2 text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition-colors"
                                title="ተመልከት"
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
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              </Link>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteLecture(lecture.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ሰርዝ"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SETTINGS TAB */}
      {/* ============================================ */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">የኮርስ መረጃ</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "ርዕስ", value: course.title },
              {
                label: "ዋጋ",
                value: `${Number(course.price).toLocaleString()} ብር`,
              },
              {
                label: "ደረጃ",
                value: levelLabels[course.level] || course.level,
              },
              { label: "ምድብ", value: course.category || "የለም" },
              { label: "አስተማሪ", value: course.instructor?.fullName || "የለም" },
              { label: "ሁኔታ", value: course.isPublished ? "የታተመ" : "ረቂቅ" },
              { label: "ተመዝጋቢዎች", value: String(course.enrollmentCount) },
              { label: "ቪዲዮዎች", value: String(course.videoCount) },
              {
                label: "ቆይታ",
                value: course.duration ? `${course.duration} ደቂቃ` : "የለም",
              },
            ].map((item, i) => (
              <div key={i} className="border-b border-gray-50 pb-2">
                <dt className="text-xs text-gray-400">{item.label}</dt>
                <dd className="text-sm font-medium text-gray-900 mt-0.5">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              href={`/courses/${courseId}`}
              target="_blank"
              className="text-sm text-[#1B2A4A] hover:underline"
            >
              ኮርሱን በይፋ ይመልከቱ →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
