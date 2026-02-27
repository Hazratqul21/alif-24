import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Star, Send, MessageSquare, X, ChevronDown, ChevronUp } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//') : '') || '/api/v1';

const FeedbackWidget = ({ page = 'home' }) => {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [stats, setStats] = useState(null);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/feedback/stats`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setStats(data.data);
      }
    } catch (err) {
      console.error('Feedback stats error:', err);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      const body = {
        rating,
        comment: comment.trim() || null,
        page,
        user_id: isAuthenticated ? user?.id : null,
        guest_name: !isAuthenticated ? (guestName.trim() || null) : null,
      };
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSubmitted(true);
        fetchStats();
        setTimeout(() => {
          setSubmitted(false);
          setIsOpen(false);
          setRating(0);
          setComment('');
          setGuestName('');
        }, 3000);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (count, size = 'w-5 h-5') => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${size} ${i < count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="w-full">
      {/* Stats Section */}
      {stats && stats.total_reviews > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Average Rating */}
              <div className="text-center">
                <div className="text-5xl font-bold text-white">{stats.average_rating}</div>
                <div className="flex items-center gap-0.5 mt-2 justify-center">
                  {renderStars(Math.round(stats.average_rating))}
                </div>
                <div className="text-sm text-white/50 mt-1">{stats.total_reviews} ta baho</div>
              </div>

              {/* Distribution */}
              <div className="flex-1 w-full space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.distribution?.[String(star)] || 0;
                  const pct = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-white/60 w-3">{star}</span>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <button
                  onClick={() => setIsOpen(true)}
                  className="bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-105"
                >
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Baho qoldiring
                </button>
              </div>
            </div>

            {/* Recent Reviews */}
            {stats.recent && stats.recent.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowReviews(!showReviews)}
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors"
                >
                  {showReviews ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  So'nggi fikrlar ({stats.recent.length})
                </button>

                {showReviews && (
                  <div className="mt-3 space-y-3">
                    {stats.recent.map((review) => (
                      <div key={review.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#4b30fb] to-[#764ba2] rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {(review.user_name || 'M').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-white">{review.user_name}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {renderStars(review.rating, 'w-3 h-3')}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-white/70 mt-1">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Button (if no stats yet) */}
      {(!stats || stats.total_reviews === 0) && !isOpen && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-[#4b30fb] to-[#764ba2] text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-105 flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Platformani baholang
          </button>
        </div>
      )}

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1001] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
            {submitted ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Rahmat!</h3>
                <p className="text-sm text-gray-500 mt-1">Fikringiz biz uchun juda muhim</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Baholang</h3>
                  <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Star Rating */}
                <div className="flex items-center justify-center gap-2 mb-5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-125 active:scale-95"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {rating > 0 && (
                  <p className="text-center text-sm font-medium text-gray-600 mb-4">
                    {rating === 1 && "Yomon"}
                    {rating === 2 && "Qoniqarsiz"}
                    {rating === 3 && "O'rtacha"}
                    {rating === 4 && "Yaxshi"}
                    {rating === 5 && "Ajoyib!"}
                  </p>
                )}

                {/* Guest Name (if not authenticated) */}
                {!isAuthenticated && (
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm mb-3"
                    placeholder="Ismingiz (ixtiyoriy)"
                  />
                )}

                {/* Comment */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                  rows={3}
                  placeholder="Fikringizni yozing... (ixtiyoriy)"
                />

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || loading}
                  className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Yuborish
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;
