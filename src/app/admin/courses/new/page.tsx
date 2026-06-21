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

// (No lecture form state here — lectures are added from course detail page)

export default function NewCoursePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [coverUploadError, setCoverUploadError] = useState("");
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

    if (field === "category") {
      if (!form.category || form.category.trim() === "") {
        errors.category = "Category is required";
      } else if (form.category.length > 100) {
        errors.category = "Category must not exceed 100 characters";
      } else {
        delete errors.category;
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

  // Lectures are managed from the course detail page after creation

  // Course media helpers
  // Lecture management removed from this page — add lectures in course detail.

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (!file.type.startsWith("image/")) {
      setCoverUploadError("Please select an image file");
      return;
    }

    setCoverUploadError("");
    setCoverUploading(true);
    setCoverUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Upload failed");
      }

      const data = uploadData.data;
      setForm((prev) => ({ ...prev, coverImage: data.url }));
      setCoverUploading(false);
      setCoverUploadProgress(100);
    } catch (error: any) {
      setCoverUploadError(error?.message || "Upload failed");
      setCoverUploading(false);
      setCoverUploadProgress(0);
    }
  };

  // Lecture uploads are handled from course detail page.

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

    if (!form.description || form.description.trim() === "") {
      errors.description = "Description is required";
      hasErrors = true;
    } else {
      const descValidation = validateCourseDescription(form.description);
      if (!descValidation.valid) {
        errors.description = descValidation.message || "Invalid description";
        hasErrors = true;
      }
    }

    if (!form.category || form.category.trim() === "") {
      errors.category = "Category is required";
      hasErrors = true;
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
      const courseData: Record<string, any> = {
        title: sanitizeInput(normalizeInput(form.title)),
        description: sanitizeInput(form.description),
        category: sanitizeInput(normalizeInput(form.category)),
        price: parseFloat(form.price) || 0,
        level: form.level,
      };

      if (form.shortDescription?.trim()) {
        courseData.shortDescription = sanitizeInput(
          normalizeInput(form.shortDescription),
        );
      }

      if (form.coverImage?.trim()) {
        courseData.coverImage = form.coverImage.trim();
      }

      const res = await fetch("/api/courses", {
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
        const created = data.data;
        router.push(`/admin/courses/${created.id}`);
      } else {
        if (data.errors && typeof data.errors === "object") {
          const apiErrors: Record<string, string> = {};
          Object.entries(data.errors).forEach(([field, value]) => {
            if (Array.isArray(value)) {
              apiErrors[field] = value.join(", ");
            } else if (typeof value === "string") {
              apiErrors[field] = value;
            }
          });
          setFieldErrors((prev) => ({ ...prev, ...apiErrors }));
        }
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
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Create New Course
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Cover Image */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border-light">
          <h3 className="font-semibold text-primary mb-4">
            🖼️ Course Cover Image
          </h3>
          <div className="grid gap-4 sm:grid-cols-[1fr_220px] items-start">
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Upload a distinct cover image for the course. This image will
                appear on the course listing and detail pages.
              </p>
              <label className="block text-sm font-medium text-gray-700">
                Cover Image URL (optional)
              </label>
              <input
                name="coverImage"
                type="url"
                value={form.coverImage}
                onChange={handleChange}
                onBlur={() => handleBlur("coverImage")}
                placeholder="https://example.com/cover.jpg"
                className="w-full border-2 border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {touched.coverImage && fieldErrors.coverImage && (
                <p className="text-red-600 text-xs">{fieldErrors.coverImage}</p>
              )}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Or upload a file
                </label>
                <label className="inline-flex items-center justify-center w-full py-3 px-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors">
                  <span>
                    {coverUploading ? "Uploading..." : "Select Image"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                </label>
                {coverUploadError && (
                  <p className="text-red-600 text-xs">{coverUploadError}</p>
                )}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-50 border border-gray-200 h-full flex items-center justify-center">
              {form.coverImage ? (
                <img
                  src={form.coverImage}
                  alt="Course cover"
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="text-center p-6 text-gray-400">
                  <p className="text-sm">No cover image selected</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lectures are added from the course detail page after creation */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border-light">
          <h3 className="font-semibold text-primary">🎥 Lectures</h3>
          <p className="text-sm text-gray-500">
            Add lectures (videos) after creating the course. You'll be
            redirected to the course admin page where you can add and upload
            lectures individually.
          </p>
        </div>

        {/* Course Details */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-border-light space-y-4">
          <h3 className="font-semibold text-primary mb-2">📝 Course Details</h3>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
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
                  : "border-gray-200 focus:ring-primary/30 focus:border-primary"
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
              <label className="block text-sm font-medium text-primary mb-1">
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
                    : "border-gray-200 focus:ring-primary/30 focus:border-primary"
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
              <label className="block text-sm font-medium text-primary mb-1">
                Level
              </label>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                className="w-full border-2 border-border-light rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
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
                  : "border-gray-200 focus:ring-primary/30 focus:border-primary"
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
            <label className="block text-sm font-medium text-primary mb-1">
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
                  : "border-gray-200 focus:ring-primary/30 focus:border-primary"
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
            <label className="block text-sm font-medium text-primary mb-1">
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
                  : "border-gray-200 focus:ring-primary/30 focus:border-primary"
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
            className="flex-1 bg-gradient-to-r from-primary to-secondary text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
