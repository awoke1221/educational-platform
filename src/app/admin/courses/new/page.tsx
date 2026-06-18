"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  validateCourseTitle,
  validateCourseDescription,
  validatePrice,
  validateUrl,
  normalizeInput,
  sanitizeInput,
} from "@/lib/validators/form-validation";

export default function NewCoursePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cloudinaryVideoUrl, setCloudinaryVideoUrl] = useState("");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    description: "",
    price: "0",
    level: "beginner",
    category: "",
    coverImage: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) router.push("/auth/login");
    else setToken(t);
  }, [router]);

  // Validate individual field
  const validateField = (field: string) => {
    const errors = { ...fieldErrors };

    if (field === "title") {
      const validation = validateCourseTitle(form.title);
      if (!validation.valid) {
        errors.title = validation.message || "Invalid title";
      } else {
        delete errors.title;
      }
    }

    if (field === "description") {
      const validation = validateCourseDescription(form.description);
      if (!validation.valid) {
        errors.description = validation.message || "Invalid description";
      } else {
        delete errors.description;
      }
    }

    if (field === "shortDescription" && form.shortDescription) {
      if (form.shortDescription.length > 200) {
        errors.shortDescription =
          "Short description must not exceed 200 characters";
      } else {
        delete errors.shortDescription;
      }
    }

    if (field === "price") {
      const validation = validatePrice(form.price);
      if (!validation.valid) {
        errors.price = validation.message || "Invalid price";
      } else {
        delete errors.price;
      }
    }

    if (field === "coverImage" && form.coverImage) {
      const validation = validateUrl(form.coverImage);
      if (!validation.valid) {
        errors.coverImage = validation.message || "Invalid URL";
      } else {
        delete errors.coverImage;
      }
    }

    if (field === "category" && form.category && form.category.length > 50) {
      errors.category = "Category must not exceed 50 characters";
    } else {
      delete errors.category;
    }

    setFieldErrors(errors);
  };

  // Handle blur
  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    validateField(field);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (touched[name]) {
      // Re-validate on change if already touched
      const prevErrors = { ...fieldErrors };
      delete prevErrors[name];
      setFieldErrors(prevErrors);
      // Re-run validation for this field
      setTimeout(() => validateField(name), 0);
    }
  };

  // Upload video to Cloudinary
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (!file.type.startsWith("video/")) {
      alert("Please select a video file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get upload signature from server
      const sigRes = await fetch("/api/upload", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sigData = await sigRes.json();

      // Upload to Cloudinary via unsigned upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        sigData.uploadPreset || "educational-platform",
      );
      formData.append("cloud_name", "dikm1x43c");
      formData.append("resource_type", "video");
      formData.append("folder", "educational-platform/courses");

      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `https://api.cloudinary.com/v1_1/dikm1x43c/video/upload`,
      );

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setCloudinaryVideoUrl(data.secure_url);
          setCloudinaryPublicId(data.public_id);
          setVideoDuration(Math.round(data.duration || 0));
          setForm((prev) => ({
            ...prev,
            coverImage: data.secure_url.replace(
              "/upload/",
              "/upload/c_fill,h_360,w_640/",
            ),
          }));
          setUploading(false);
          setUploadProgress(100);
        } else {
          alert("Upload failed");
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        alert("Upload error");
        setUploading(false);
      };

      xhr.send(formData);
    } catch {
      alert("Upload failed");
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Mark all fields as touched and validate
    setTouched({
      title: true,
      shortDescription: true,
      description: true,
      price: true,
      category: true,
      coverImage: true,
    });

    // Validate all required fields
    let hasErrors = false;
    const errors: Record<string, string> = {};

    const titleValidation = validateCourseTitle(form.title);
    if (!titleValidation.valid) {
      errors.title = titleValidation.message || "Invalid title";
      hasErrors = true;
    }

    if (form.description) {
      const descValidation = validateCourseDescription(form.description);
      if (!descValidation.valid) {
        errors.description = descValidation.message || "Invalid description";
        hasErrors = true;
      }
    }

    const priceValidation = validatePrice(form.price);
    if (!priceValidation.valid) {
      errors.price = priceValidation.message || "Invalid price";
      hasErrors = true;
    }

    if (form.coverImage) {
      const urlValidation = validateUrl(form.coverImage);
      if (!urlValidation.valid) {
        errors.coverImage = urlValidation.message || "Invalid URL";
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const courseData = {
        title: sanitizeInput(normalizeInput(form.title)),
        shortDescription: form.shortDescription
          ? sanitizeInput(normalizeInput(form.shortDescription))
          : "",
        description: form.description ? sanitizeInput(form.description) : "",
        category: form.category
          ? sanitizeInput(normalizeInput(form.category))
          : "",
        price: parseFloat(form.price) || 0,
        level: form.level,
        coverImage: form.coverImage,
        videoUrl: cloudinaryVideoUrl,
        cloudinaryPublicId,
        videoDuration,
      };

      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(courseData),
      });

      const data = await res.json();
      if (data.success) {
        alert("Course created successfully!");
        router.push("/admin/courses");
      } else {
        alert(data.error || "Failed to create course");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/admin/courses"
          className="text-gray-400 hover:text-gray-600"
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
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00BCD4] to-[#FF1744] bg-clip-text text-transparent">
          Create New Course
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cloudinary Video Upload */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E0F7FA]">
          <h3 className="font-semibold text-[#0D3B4A] mb-4">🎬 Upload Video</h3>
          <div className="border-2 border-dashed border-[#E0F7FA] rounded-xl p-8 text-center hover:border-[#00BCD4]/50 transition-colors">
            {uploading ? (
              <div>
                <div className="w-full bg-[#F0FEFF] rounded-full h-3 mb-3">
                  <div
                    className="bg-gradient-to-r from-[#00BCD4] to-[#FF1744] h-3 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-[#4A7278]">
                  Uploading video... {uploadProgress}%
                </p>
              </div>
            ) : cloudinaryVideoUrl ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-green-600 mb-1">
                  Video uploaded!
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {videoDuration} seconds
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCloudinaryVideoUrl("");
                    setCloudinaryPublicId("");
                  }}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Click to upload video
                </p>
                <p className="text-xs text-gray-400">
                  MP4, WebM, MOV (under 100MB)
                </p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Course Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#E0F7FA] space-y-4">
          <h3 className="font-semibold text-[#0D3B4A] mb-2">
            📝 Course Details
          </h3>

          <div>
            <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
              Course Title *
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              onBlur={() => handleBlur("title")}
              required
              className={`w-full border-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                touched.title && fieldErrors.title
                  ? "border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400"
                  : "border-gray-200 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4]"
              }`}
            />
            {touched.title && fieldErrors.title && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {fieldErrors.title}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
                Price (ETB)
              </label>
              <input
                name="price"
                type="number"
                min="0"
                value={form.price}
                onChange={handleChange}
                onBlur={() => handleBlur("price")}
                className={`w-full border-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                  touched.price && fieldErrors.price
                    ? "border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400"
                    : "border-gray-200 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4]"
                }`}
              />
              {touched.price && fieldErrors.price && (
                <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {fieldErrors.price}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
                Level
              </label>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                className="w-full border-2 border-[#E0F7FA] rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4] bg-[#F0FEFF]"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
              Category
            </label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              onBlur={() => handleBlur("category")}
              placeholder="e.g. Science, Arts, Technology"
              className={`w-full border-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                touched.category && fieldErrors.category
                  ? "border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400"
                  : "border-gray-200 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4]"
              }`}
            />
            {touched.category && fieldErrors.category && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {fieldErrors.category}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
              Short Description
            </label>
            <input
              name="shortDescription"
              value={form.shortDescription}
              onChange={handleChange}
              onBlur={() => handleBlur("shortDescription")}
              className={`w-full border-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                touched.shortDescription && fieldErrors.shortDescription
                  ? "border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400"
                  : "border-gray-200 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4]"
              }`}
            />
            {touched.shortDescription && fieldErrors.shortDescription && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {fieldErrors.shortDescription}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0D3B4A] mb-1">
              Detailed Description
            </label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              onBlur={() => handleBlur("description")}
              className={`w-full border-2 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 transition-all ${
                touched.description && fieldErrors.description
                  ? "border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400"
                  : "border-gray-200 focus:ring-[#00BCD4]/30 focus:border-[#00BCD4]"
              }`}
            />
            {touched.description && fieldErrors.description && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18.101 12.93a.75.75 0 000-1.06l-7.783-7.783a.75.75 0 00-1.06 0L1.515 11.87a.75.75 0 001.06 1.06l7.329-7.33 7.097 7.097a.75.75 0 001.06 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {fieldErrors.description}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={
              loading || !form.title || Object.keys(fieldErrors).length > 0
            }
            className="flex-1 bg-gradient-to-r from-[#00BCD4] to-[#FF1744] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Course"}
          </button>
          <Link
            href="/admin/courses"
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
