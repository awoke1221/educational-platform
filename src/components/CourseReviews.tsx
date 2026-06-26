"use client";

// ============================================
// ⭐ Course Reviews Component
// ============================================
// Displays reviews, ratings, and a submit form
// ============================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// Types
// ============================================

interface ReviewUser {
  id: string;
  fullName: string;
  profileImage?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: ReviewUser;
}

interface ReviewStats {
  total: number;
  averageRating: number;
  distribution: number[]; // [1star, 2star, 3star, 4star, 5star]
}

interface CourseReviewsProps {
  courseId: string;
  isEnrolled: boolean;
  token: string;
}

// ============================================
// Helpers
// ============================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StarRating({
  rating,
  interactive = false,
  onRate,
  size = "sm",
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(0);
  const starSize = size === "md" ? "w-6 h-6" : "w-4 h-4";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? "button" : undefined}
          disabled={!interactive}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate?.(star)}
          className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
        >
          <svg
            className={`${starSize} ${
              star <= (hovered || rating)
                ? "text-yellow-400"
                : "text-gray-300 dark:text-gray-600"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function CourseReviews({
  courseId,
  isEnrolled,
  token,
}: CourseReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?courseId=${courseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setReviews(d.data.reviews);
          setStats(d.data.stats);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRating === 0) {
      setSubmitError("Please select a rating");
      return;
    }
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          rating: newRating,
          comment: newComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        setNewRating(0);
        setNewComment("");
        setShowForm(false);
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        setSubmitError(data.error || "Failed to submit review");
      }
    } catch (err: any) {
      setSubmitError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-semibold text-primary dark:text-gray-100 flex items-center gap-2">
            ⭐ Reviews
            {stats && (
              <span className="text-xs font-normal text-gray-400">
                ({stats.total})
              </span>
            )}
          </h3>
          {stats && stats.total > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {stats.averageRating}
              </span>
              <StarRating rating={Math.round(stats.averageRating)} size="md" />
              <span className="text-xs text-gray-400">
                {stats.total} review{stats.total !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {isEnrolled && token && !submitSuccess && (
          <button
            onClick={() => setShowForm(!showForm)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${
              showForm
                ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                : "bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white hover:shadow-lg hover:shadow-[#a30000]/20 hover:-translate-y-0.5 transition-all duration-300"
            }`}
          >
            {showForm ? "Cancel" : "Write Review"}
          </button>
        )}
      </div>

      {/* Rating Distribution */}
      {stats && stats.total > 0 && (
        <div className="mb-6 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-right text-gray-500 dark:text-gray-400">
                {star}★
              </span>
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{
                    width: `${stats.total > 0 ? (stats.distribution[star - 1] / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="w-6 text-gray-400 dark:text-gray-500">
                {stats.distribution[star - 1]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Submit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden"
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Rating
            </p>
            <div className="mb-3">
              <StarRating
                rating={newRating}
                interactive
                onRate={setNewRating}
                size="md"
              />
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your experience with this course..."
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none dark:text-gray-200 dark:placeholder-gray-400"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">
                {newComment.length}/1000
              </span>
              {submitError && (
                <span className="text-xs text-red-500">{submitError}</span>
              )}
              <button
                type="submit"
                disabled={submitting || newRating === 0}
                className="px-4 py-2 bg-gradient-to-r from-[#5c0000] to-[#a30000] text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-[#a30000]/20 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
          ✅ Review submitted! It will appear after admin approval.
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <p className="text-sm">No reviews yet</p>
          {isEnrolled && !showForm && (
            <p className="text-xs mt-1">Be the first to review this course!</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {review.user.fullName?.charAt(0) || "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {review.user.fullName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <StarRating rating={review.rating} />
                  {review.comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
