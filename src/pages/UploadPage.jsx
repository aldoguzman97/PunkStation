import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useMediaStore } from '../store/mediaStore';
import { Upload, Film, Image, Music, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UploadPage() {
  const { upload } = useMediaStore();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      const f = accepted[0];
      setFile(f);
      setTitle(f.name.replace(/\.[^.]+$/, ''));

      if (f.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(f));
      } else {
        setPreview(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.ogg'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
      'audio/*': ['.mp3', '.ogg', '.wav'],
    },
    maxSize: 500 * 1024 * 1024,
    multiple: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await upload(file, { title, description, tags: tagArray }, setProgress);
      toast.success('Upload complete');
      navigate(`/media/${result.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getTypeIcon = () => {
    if (!file) return <Upload size={48} />;
    if (file.type.startsWith('video/')) return <Film size={48} className="text-cyan" />;
    if (file.type.startsWith('image/')) return <Image size={48} className="text-magenta" />;
    if (file.type.startsWith('audio/')) return <Music size={48} style={{ color: 'var(--purple)' }} />;
    return <Upload size={48} />;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="page-upload">
      <h1 className="font-display" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        <Upload size={20} className="text-cyan" />{' '}
        <span className="text-cyan">UPLOAD</span> MEDIA
      </h1>

      <form onSubmit={handleSubmit} className="upload-form">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`upload-dropzone cyber-card ${isDragActive ? 'upload-dropzone--active' : ''} ${file ? 'upload-dropzone--has-file' : ''}`}
        >
          <input {...getInputProps()} />

          {preview ? (
            <img src={preview} alt="Preview" className="upload-preview" />
          ) : (
            getTypeIcon()
          )}

          {file ? (
            <div className="upload-file-info">
              <p className="font-mono text-cyan">{file.name}</p>
              <p className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>
                {formatSize(file.size)} // {file.type}
              </p>
              <button
                type="button"
                className="cyber-btn cyber-btn--red"
                style={{ marginTop: '0.5rem', padding: '0.3rem 0.8rem', fontSize: '0.7rem' }}
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
              >
                <X size={12} /> REMOVE
              </button>
            </div>
          ) : (
            <div className="upload-instructions">
              <p className="font-display" style={{ fontSize: '1.1rem' }}>
                DROP FILES HERE
              </p>
              <p className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>
                or click to browse // video, image, audio // max 500MB
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="upload-fields cyber-card">
          <div className="auth-field">
            <label className="auth-label font-mono">TITLE</label>
            <input
              type="text"
              className="cyber-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Media title..."
              required
              maxLength={200}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label font-mono">DESCRIPTION</label>
            <textarea
              className="cyber-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your media..."
              rows={4}
              maxLength={5000}
              style={{ resize: 'vertical', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label font-mono">TAGS (comma separated)</label>
            <input
              type="text"
              className="cyber-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="cyberpunk, glitch, media..."
            />
          </div>
        </div>

        {/* Progress */}
        {uploading && (
          <div className="upload-progress">
            <div className="cyber-progress">
              <div className="cyber-progress__fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono text-cyan">{progress}%</span>
          </div>
        )}

        <button
          type="submit"
          className="cyber-btn cyber-btn--filled cyber-btn--lg"
          disabled={!file || uploading}
          style={{ width: '100%' }}
        >
          {uploading ? (
            <><div className="cyber-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> UPLOADING...</>
          ) : (
            <><Check size={18} /> INITIATE UPLOAD</>
          )}
        </button>
      </form>
    </div>
  );
}
