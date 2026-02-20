import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMediaStore } from '../store/mediaStore';
import { useAuthStore } from '../store/authStore';
import {
  Eye, Heart, MessageSquare, Flag, Trash2, Edit3,
  Film, Image, Music, ArrowLeft, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MediaViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentItem, fetchOne, toggleLike, addComment, deleteMedia, loading } = useMediaStore();
  const { user } = useAuthStore();
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [reportReason, setReportReason] = useState('');
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    fetchOne(id).then((data) => {
      if (data) {
        setLikeCount(data.likeCount || 0);
        setComments(data.comments || []);
      }
    });
  }, [id, fetchOne]);

  const handleLike = async () => {
    try {
      const result = await toggleLike(id);
      setLiked(result);
      setLikeCount((c) => (result ? c + 1 : c - 1));
    } catch {
      toast.error('Like failed');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const newComment = await addComment(id, comment);
      setComments([newComment, ...comments]);
      setComment('');
    } catch {
      toast.error('Comment failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this media permanently?')) return;
    try {
      await deleteMedia(id);
      toast.success('Media deleted');
      navigate('/dashboard');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      const { reportMedia } = useMediaStore.getState();
      await reportMedia(id, reportReason);
      toast.success('Report submitted');
      setShowReport(false);
      setReportReason('');
    } catch {
      toast.error('Report failed');
    }
  };

  if (loading || !currentItem) {
    return (
      <div className="page-center">
        <div className="cyber-spinner" />
      </div>
    );
  }

  const item = currentItem;
  const isOwner = user?.id === item.user_id;
  const isAdmin = user?.role === 'admin';
  const SERVER_URL = 'http://localhost:3001';

  return (
    <div className="page-media-view">
      <Link to="/browse" className="cyber-btn" style={{ marginBottom: '1rem', display: 'inline-flex' }}>
        <ArrowLeft size={16} /> BACK
      </Link>

      <div className="media-view-layout">
        {/* Player / Preview */}
        <div className="media-view-player cyber-card">
          {item.type === 'video' && (
            <video
              controls
              className="media-view-video"
              src={`${SERVER_URL}/uploads/${item.filename}`}
            />
          )}
          {item.type === 'image' && (
            <img
              className="media-view-image"
              src={`${SERVER_URL}/uploads/${item.filename}`}
              alt={item.title}
            />
          )}
          {item.type === 'audio' && (
            <div className="media-view-audio-wrapper">
              <Music size={64} style={{ color: 'var(--purple)' }} />
              <audio
                controls
                className="media-view-audio"
                src={`${SERVER_URL}/uploads/${item.filename}`}
              />
            </div>
          )}
        </div>

        {/* Info sidebar */}
        <div className="media-view-info">
          <div className="cyber-card">
            <span className={`cyber-badge ${item.type === 'image' ? 'cyber-badge--magenta' : item.type === 'audio' ? 'cyber-badge--yellow' : ''}`}>
              {item.type}
            </span>
            <h1 className="font-display" style={{ fontSize: '1.25rem', marginTop: '0.75rem' }}>
              {item.title}
            </h1>
            <p className="font-mono text-dim" style={{ fontSize: '0.8rem', margin: '0.5rem 0' }}>
              by <span className="text-cyan">@{item.username}</span> //
              {new Date(item.created_at).toLocaleDateString()}
            </p>

            {item.description && (
              <p style={{ margin: '1rem 0', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {item.description}
              </p>
            )}

            <div className="hud-line" />

            {/* Stats + actions */}
            <div className="media-view-stats">
              <span className="font-mono text-dim"><Eye size={14} /> {item.views}</span>
              <span className="font-mono text-dim"><Heart size={14} /> {likeCount}</span>
              <span className="font-mono text-dim"><MessageSquare size={14} /> {comments.length}</span>
            </div>

            <div className="media-view-actions">
              <button
                className={`cyber-btn ${liked ? 'cyber-btn--filled border-magenta' : 'cyber-btn--magenta'}`}
                onClick={handleLike}
                style={{ flex: 1 }}
              >
                <Heart size={14} /> {liked ? 'LIKED' : 'LIKE'}
              </button>

              <button
                className="cyber-btn"
                onClick={() => setShowReport(!showReport)}
                style={{ flex: 1 }}
              >
                <Flag size={14} /> REPORT
              </button>

              {(isOwner || isAdmin) && (
                <button className="cyber-btn cyber-btn--red" onClick={handleDelete}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {showReport && (
              <div style={{ marginTop: '1rem' }}>
                <textarea
                  className="cyber-input"
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe the issue..."
                  style={{ fontFamily: 'var(--font-mono)', resize: 'none' }}
                />
                <button
                  className="cyber-btn cyber-btn--red"
                  style={{ marginTop: '0.5rem', width: '100%' }}
                  onClick={handleReport}
                >
                  SUBMIT REPORT
                </button>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="cyber-card" style={{ marginTop: '1rem' }}>
            <h3 className="font-display" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
              <MessageSquare size={16} className="text-cyan" /> COMMENTS ({comments.length})
            </h3>

            <form onSubmit={handleComment} className="media-view-comment-form">
              <input
                type="text"
                className="cyber-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add comment..."
                maxLength={2000}
              />
              <button type="submit" className="cyber-btn cyber-btn--filled">
                <Send size={14} />
              </button>
            </form>

            <div className="media-view-comments">
              {comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-item__header">
                    <span className="text-cyan font-mono">@{c.username}</span>
                    <span className="text-dim font-mono" style={{ fontSize: '0.7rem' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="comment-item__body">{c.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="font-mono text-dim" style={{ textAlign: 'center', padding: '1rem' }}>
                  No comments yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
