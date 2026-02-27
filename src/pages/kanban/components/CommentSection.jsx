import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Edit2, Trash2, Image, Mic, X, Play, Pause, StopCircle, MoreVertical, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const CommentSection = ({ task, currentUser }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showEditHistory, setShowEditHistory] = useState(null);
  const [editHistory, setEditHistory] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioPlayerRef = useRef({});
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (task) {
      loadComments();
      
      const channel = supabase
        .channel(`comments:${task.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_comments',
            filter: `task_id=eq.${task.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              loadComments();
            } else if (payload.eventType === 'UPDATE') {
              setComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
            } else if (payload.eventType === 'DELETE') {
              setComments(prev => prev.filter(c => c.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };
    }
  }, [task]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadComments = async () => {
    if (!task) return;
    
    try {
      setLoading(true);
      
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:users!task_comments_user_id_fkey(id, full_name)
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
        throw commentsError;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      const formattedComments = commentsData.map(comment => ({
        ...comment,
        user: comment.user ? {
          id: comment.user.id,
          name: comment.user.full_name || 'Unknown User'
        } : {
          id: comment.user_id,
          name: 'Unknown User'
        }
      }));

      setComments(formattedComments);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEditHistory = async (commentId) => {
    try {
      const { data, error } = await supabase
        .from('comment_edit_history')
        .select('*')
        .eq('comment_id', commentId)
        .order('edited_at', { ascending: false });

      if (error) throw error;
      setEditHistory(data || []);
      setShowEditHistory(commentId);
    } catch (err) {
      console.error('Error loading edit history:', err);
      alert('Edit history feature requires database migration. Please run the SQL migration first.');
    }
  };

  const canEditComment = (createdAt) => {
    const commentTime = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now - commentTime) / (1000 * 60 * 60);
    return hoursDiff < 1; 
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const removeAudio = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const uploadFile = async (file, bucket, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${currentUser.id}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim() && !selectedImage && !audioBlob) {
      return; 
    }

    try {
      setSubmitting(true);
      
      let imageUrl = null;
      let audioUrl = null;

      if (selectedImage) {
        imageUrl = await uploadFile(selectedImage, 'task-images', 'comments');
      }

      if (audioBlob) {
        const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
        audioUrl = await uploadFile(audioFile, 'task-audio', 'comments');
      }

      const { error } = await supabase
        .from('task_comments')
        .insert([
          {
            task_id: task.id,
            user_id: currentUser.id,
            comment: newComment.trim() || null,
            image_url: imageUrl,
            audio_url: audioUrl
          }
        ]);

      if (error) throw error;

      setNewComment('');
      removeImage();
      removeAudio();
      await loadComments();
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editingComment.comment.trim()) return;

    try {
      const originalComment = comments.find(c => c.id === editingComment.id);
      
      try {
        await supabase
          .from('comment_edit_history')
          .insert([
            {
              comment_id: editingComment.id,
              previous_comment: originalComment.comment,
              edited_at: new Date().toISOString()
            }
          ]);
      } catch {
        //test
      }

      const { error } = await supabase
        .from('task_comments')
        .update({ 
          comment: editingComment.comment.trim()
        })
        .eq('id', editingComment.id);

      if (error) throw error;

      setEditingComment(null);
      setOpenMenuId(null);
      await loadComments();
    } catch (err) {
      console.error('Error updating comment:', err);
      alert('Failed to update comment. Please try again.');
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      if (comment.image_url) {
        const imagePath = comment.image_url.split('/task-images/')[1];
        if (imagePath) {
          await supabase.storage.from('task-images').remove([imagePath]);
        }
      }

      if (comment.audio_url) {
        const audioPath = comment.audio_url.split('/task-audio/')[1];
        if (audioPath) {
          await supabase.storage.from('task-audio').remove([audioPath]);
        }
      }

      try {
        await supabase
          .from('comment_edit_history')
          .delete()
          .eq('comment_id', comment.id);
      } catch  {
        //test
      }

      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', comment.id);

      if (error) throw error;
      setOpenMenuId(null);
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const toggleAudioPlayback = (commentId, audioUrl) => {
    const audio = audioPlayerRef.current[commentId];

    if (playingAudio === commentId) {
      audio.pause();
      setPlayingAudio(null);
    } else {
      // Pause any currently playing audio
      Object.keys(audioPlayerRef.current).forEach(id => {
        if (audioPlayerRef.current[id]) {
          audioPlayerRef.current[id].pause();
        }
      });

      if (!audio) {
        const newAudio = new Audio(audioUrl);
        newAudio.onended = () => setPlayingAudio(null);
        audioPlayerRef.current[commentId] = newAudio;
        newAudio.play();
      } else {
        audio.play();
      }
      setPlayingAudio(commentId);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="comment-section-container">
      <style>{`
        /* Comment Section - Mobile-First Responsive Design */
        .comment-section-container {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }

        @media (min-width: 640px) {
          .comment-section-container {
            padding-top: 1.5rem;
          }
        }

        /* Header */
        .comment-section-header {
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          font-size: 0.875rem;
          gap: 0.5rem;
        }

        @media (min-width: 640px) {
          .comment-section-header {
            margin-bottom: 1rem;
            font-size: 1rem;
          }
        }

        @media (min-width: 768px) {
          .comment-section-header {
            font-size: 1.125rem;
          }
        }

        /* Comments List */
        .comments-list-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
          max-height: 20rem;
          overflow-y: auto;
          padding-right: 0.25rem;
        }

        @media (min-width: 640px) {
          .comments-list-container {
            gap: 1rem;
            max-height: 24rem;
          }
        }

        /* Custom Scrollbar */
        .comments-list-container::-webkit-scrollbar {
          width: 4px;
        }

        @media (min-width: 640px) {
          .comments-list-container::-webkit-scrollbar {
            width: 6px;
          }
        }

        .comments-list-container::-webkit-scrollbar-track {
          background: #f3f4f6;
          border-radius: 3px;
        }

        .comments-list-container::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .comments-list-container::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Comment Item */
        .comment-item-wrapper {
          display: flex;
          gap: 0.5rem;
        }

        .comment-item-wrapper.owner {
          flex-direction: row-reverse;
        }

        /* Avatar */
        .comment-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        @media (min-width: 640px) {
          .comment-avatar {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 0.875rem;
          }
        }

        .comment-avatar.owner {
          background: #16a34a;
        }

        .comment-avatar.other {
          background: #2563eb;
        }

        /* Content Wrapper */
        .comment-content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 85%;
          min-width: 0;
        }

        @media (min-width: 640px) {
          .comment-content-wrapper {
            max-width: 75%;
          }
        }

        .comment-content-wrapper.owner {
          align-items: flex-end;
        }

        .comment-content-wrapper.other {
          align-items: flex-start;
        }

        /* Header Info */
        .comment-header-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
          padding: 0 0.25rem;
        }

        .comment-header-info.owner {
          flex-direction: row-reverse;
        }

        .comment-user-name {
          font-weight: 600;
          color: #111827;
          font-size: 0.75rem;
        }

        @media (min-width: 640px) {
          .comment-user-name {
            font-size: 0.875rem;
          }
        }

        .comment-timestamp {
          font-size: 0.625rem;
          color: #9ca3af;
          white-space: nowrap;
        }

        @media (min-width: 640px) {
          .comment-timestamp {
            font-size: 0.75rem;
          }
        }

        /* Bubble */
        .comment-bubble-wrapper {
          position: relative;
          width: 100%;
        }

        .comment-bubble {
          border-radius: 1rem;
          padding: 0.625rem 0.75rem;
          position: relative;
        }

        @media (min-width: 640px) {
          .comment-bubble {
            padding: 0.875rem;
            border-radius: 1.25rem;
          }
        }

        .comment-bubble.owner {
          background: #dcfce7;
        }

        .comment-bubble.other {
          background: #f3f4f6;
        }

        /* Edited Badge */
        .edited-badge {
          font-size: 0.625rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 0;
        }

        .edited-badge:hover {
          color: #374151;
        }

        @media (min-width: 640px) {
          .edited-badge {
            font-size: 0.75rem;
          }
        }

        /* Menu Button */
        .comment-menu-button {
          position: absolute;
          top: 0.375rem;
          right: 0.375rem;
          color: #9ca3af;
          padding: 0.25rem;
          border-radius: 0.25rem;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        @media (min-width: 640px) {
          .comment-menu-button {
            top: 0.5rem;
            right: 0.5rem;
          }
        }

        .comment-menu-button:hover {
          color: #4b5563;
          background: rgba(255, 255, 255, 0.5);
        }

        .comment-menu-dropdown {
          position: absolute;
          right: 0;
          margin-top: 0.25rem;
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          padding: 0.25rem 0;
          z-index: 20;
          min-width: 7rem;
        }

        .menu-option {
          width: 100%;
          padding: 0.5rem 0.75rem;
          text-align: left;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        @media (min-width: 640px) {
          .menu-option {
            font-size: 0.875rem;
          }
        }

        .menu-option.edit {
          color: #374151;
        }

        .menu-option.edit:hover {
          background: #f9fafb;
        }

        .menu-option.delete {
          color: #dc2626;
        }

        .menu-option.delete:hover {
          background: #fef2f2;
        }

        /* Comment Text */
        .comment-text {
          color: #374151;
          font-size: 0.8125rem;
          white-space: pre-wrap;
          word-break: break-word;
          padding-right: 1.5rem;
          line-height: 1.5;
        }

        @media (min-width: 640px) {
          .comment-text {
            font-size: 0.875rem;
            line-height: 1.6;
          }
        }

        /* Image */
        .comment-image-container {
          margin-top: 0.5rem;
        }

        .comment-image {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          max-height: 12rem;
          object-fit: cover;
          cursor: pointer;
        }

        .comment-image:hover {
          opacity: 0.9;
        }

        @media (min-width: 640px) {
          .comment-image {
            max-height: 16rem;
          }
        }

        /* Voice Note */
        .voice-note-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          margin-top: 0.5rem;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        @media (min-width: 640px) {
          .voice-note-button {
            font-size: 0.875rem;
          }
        }

        .voice-note-button.owner {
          background: #dcfce7;
          color: #15803d;
        }

        .voice-note-button.owner:hover {
          background: #bbf7d0;
        }

        .voice-note-button.other {
          background: #dbeafe;
          color: #1e40af;
        }

        .voice-note-button.other:hover {
          background: #bfdbfe;
        }

        /* Edit Form */
        .edit-textarea {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          outline: none;
          resize: none;
          margin-top: 0.5rem;
        }

        @media (min-width: 640px) {
          .edit-textarea {
            font-size: 0.875rem;
          }
        }

        .edit-textarea:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
        }

        .edit-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .edit-button {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 0.25rem;
          border: none;
          cursor: pointer;
        }

        @media (min-width: 640px) {
          .edit-button {
            font-size: 0.875rem;
          }
        }

        .edit-button.cancel {
          background: transparent;
          color: #4b5563;
        }

        .edit-button.cancel:hover {
          color: #1f2937;
        }

        .edit-button.save {
          background: #16a34a;
          color: white;
        }

        .edit-button.save:hover {
          background: #15803d;
        }

        /* Empty/Loading States */
        .comments-empty-state {
          text-align: center;
          padding: 2rem 1rem;
          color: #6b7280;
          font-size: 0.8125rem;
        }

        @media (min-width: 640px) {
          .comments-empty-state {
            font-size: 0.875rem;
            padding: 1rem;
          }
        }

        .loading-spinner-container {
          text-align: center;
          padding: 1rem;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
          border-radius: 50%;
          height: 2rem;
          width: 2rem;
          border: 2px solid transparent;
          border-bottom-color: #2563eb;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Preview */
        .preview-container {
          margin-bottom: 0.75rem;
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        @media (min-width: 640px) {
          .preview-container {
            padding: 0.75rem;
          }
        }

        .preview-image-wrapper {
          position: relative;
          display: inline-block;
        }

        .preview-image {
          max-height: 6rem;
          border-radius: 0.5rem;
        }

        @media (min-width: 640px) {
          .preview-image {
            max-height: 8rem;
          }
        }

        .preview-remove-button {
          position: absolute;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          padding: 0.25rem;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-remove-button:hover {
          background: #dc2626;
        }

        .preview-remove-button.corner {
          top: -0.375rem;
          right: -0.375rem;
        }

        @media (min-width: 640px) {
          .preview-remove-button.corner {
            top: -0.5rem;
            right: -0.5rem;
          }
        }

        .preview-audio-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #dbeafe;
          padding: 0.375rem 0.625rem;
          border-radius: 0.5rem;
        }

        @media (min-width: 640px) {
          .preview-audio-wrapper {
            padding: 0.5rem 0.75rem;
          }
        }

        .preview-audio-text {
          font-size: 0.75rem;
          color: #1e40af;
          flex: 1;
        }

        @media (min-width: 640px) {
          .preview-audio-text {
            font-size: 0.875rem;
          }
        }

        /* Form */
        .comment-form-container {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .comment-textarea {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          outline: none;
          resize: none;
          min-height: 4rem;
        }

        @media (min-width: 640px) {
          .comment-textarea {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            min-height: 4.5rem;
          }
        }

        .comment-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }

        .comment-textarea:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .comment-actions-column {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        @media (min-width: 640px) {
          .comment-actions-column {
            gap: 0.5rem;
          }
        }

        .action-button {
          padding: 0.375rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 640px) {
          .action-button {
            padding: 0.5rem;
          }
        }

        .action-button:hover:not(:disabled) {
          background: #f9fafb;
        }

        .action-button:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.5;
        }

        .action-button.recording {
          background: #ef4444;
          border-color: #ef4444;
        }

        .action-button.recording:hover {
          background: #dc2626;
        }

        .action-button.send {
          background: #2563eb;
          border-color: #2563eb;
        }

        .action-button.send:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .action-button.send:disabled {
          background: #9ca3af;
          border-color: #9ca3af;
        }

        .action-icon {
          width: 1.125rem;
          height: 1.125rem;
        }

        @media (min-width: 640px) {
          .action-icon {
            width: 1.25rem;
            height: 1.25rem;
          }
        }

        .action-icon.active {
          color: #2563eb;
        }

        .action-icon.inactive {
          color: #6b7280;
        }

        .action-icon.white {
          color: white;
        }

        /* Recording Indicator */
        .recording-indicator {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #dc2626;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        @media (min-width: 640px) {
          .recording-indicator {
            font-size: 0.875rem;
          }
        }

        .recording-dot {
          width: 0.5rem;
          height: 0.5rem;
          background: #dc2626;
          border-radius: 50%;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 0.75rem;
          max-width: 42rem;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          border-bottom: 1px solid #e5e7eb;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @media (min-width: 640px) {
          .modal-header {
            padding: 1rem 1.5rem;
          }
        }

        .modal-title {
          font-weight: bold;
          font-size: 1rem;
        }

        @media (min-width: 640px) {
          .modal-title {
            font-size: 1.125rem;
          }
        }

        .modal-close-button {
          color: #9ca3af;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
        }

        .modal-close-button:hover {
          color: #4b5563;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }

        @media (min-width: 640px) {
          .modal-body {
            padding: 1.5rem;
          }
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .history-item {
          background: #f9fafb;
          border-radius: 0.5rem;
          padding: 0.75rem;
        }

        .history-item-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .history-item-text {
          font-size: 0.8125rem;
          color: #374151;
          white-space: pre-wrap;
          line-height: 1.5;
        }

        @media (min-width: 640px) {
          .history-item-text {
            font-size: 0.875rem;
          }
        }

        .history-badge {
          color: #2563eb;
          font-weight: 500;
        }
      `}</style>

      <h4 className="comment-section-header">
        <MessageSquare size={16} />
        Comments ({comments.length})
      </h4>

      {/* Comments List */}
      <div className="comments-list-container">
        {loading ? (
          <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
          </div>
        ) : comments.length === 0 ? (
          <p className="comments-empty-state">No comments yet</p>
        ) : (
          comments.map((comment) => {
            const isOwner = currentUser?.id === comment.user_id;
            const canEdit = canEditComment(comment.created_at);
            const isEdited = comment.edit_count > 0 || comment.last_edited_at;
            
            return (
              <div 
                key={comment.id} 
                className={`comment-item-wrapper ${isOwner ? 'owner' : ''}`}
              >
                <div className={`comment-avatar ${isOwner ? 'owner' : 'other'}`}>
                  {comment.user?.name?.charAt(0).toUpperCase()}
                </div>

                <div className={`comment-content-wrapper ${isOwner ? 'owner' : 'other'}`}>
                  <div className={`comment-header-info ${isOwner ? 'owner' : ''}`}>
                    <p className="comment-user-name">{comment.user?.name}</p>
                    <p className="comment-timestamp">{formatDate(comment.created_at)}</p>
                  </div>

                  <div className="comment-bubble-wrapper">
                    <div className={`comment-bubble ${isOwner ? 'owner' : 'other'}`}>
                      {isEdited && (
                        <button
                          onClick={() => loadEditHistory(comment.id)}
                          className="edited-badge"
                        >
                          <Clock size={10} />
                          <span>Edited</span>
                        </button>
                      )}

                      {isOwner && (
                        <div ref={openMenuId === comment.id ? menuRef : null}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                            className="comment-menu-button"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {openMenuId === comment.id && (
                            <div className="comment-menu-dropdown">
                              {canEdit && comment.comment && !comment.image_url && !comment.audio_url && (
                                <button
                                  onClick={() => {
                                    setEditingComment({ ...comment, originalComment: comment.comment });
                                    setOpenMenuId(null);
                                  }}
                                  className="menu-option edit"
                                >
                                  <Edit2 size={12} />
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteComment(comment)}
                                className="menu-option delete"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {editingComment?.id === comment.id ? (
                        <div>
                          <textarea
                            value={editingComment.comment}
                            onChange={(e) => setEditingComment({ ...editingComment, comment: e.target.value })}
                            className="edit-textarea"
                            rows="2"
                            autoFocus
                          />
                          <div className="edit-buttons">
                            <button
                              onClick={() => setEditingComment(null)}
                              className="edit-button cancel"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateComment}
                              className="edit-button save"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {comment.comment && (
                            <p className="comment-text">
                              {comment.comment}
                            </p>
                          )}
                          
                          {comment.image_url && (
                            <div className="comment-image-container">
                              <img 
                                src={comment.image_url} 
                                alt="Comment attachment" 
                                className="comment-image"
                                onClick={() => window.open(comment.image_url, '_blank')}
                              />
                            </div>
                          )}
                          
                          {comment.audio_url && (
                            <button
                              onClick={() => toggleAudioPlayback(comment.id, comment.audio_url)}
                              className={`voice-note-button ${isOwner ? 'owner' : 'other'}`}
                            >
                              {playingAudio === comment.id ? (
                                <Pause size={14} />
                              ) : (
                                <Play size={14} />
                              )}
                              <span>Voice Note</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit History Modal */}
      {showEditHistory && (
        <div className="modal-overlay" onClick={() => { setShowEditHistory(null); setEditHistory([]); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit History</h3>
              <button
                onClick={() => {
                  setShowEditHistory(null);
                  setEditHistory([]);
                }}
                className="modal-close-button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {editHistory.length === 0 ? (
                <p className="comments-empty-state">No edit history</p>
              ) : (
                <div className="history-list">
                  {editHistory.map((edit, index) => (
                    <div key={edit.id} className="history-item">
                      <div className="history-item-header">
                        <Clock size={12} />
                        <span>{formatDate(edit.edited_at)}</span>
                        {index === 0 && <span className="history-badge">(Previous version)</span>}
                      </div>
                      <p className="history-item-text">{edit.previous_comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment}>
        {(imagePreview || audioBlob) && (
          <div className="preview-container">
            {imagePreview && (
              <div className="preview-image-wrapper">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="preview-image"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="preview-remove-button corner"
                >
                  <X size={10} />
                </button>
              </div>
            )}
            
            {audioBlob && (
              <div className="preview-audio-wrapper">
                <Mic size={14} className="action-icon active" />
                <span className="preview-audio-text">Voice note ({formatRecordingTime(recordingTime)})</span>
                <button
                  type="button"
                  onClick={removeAudio}
                  className="preview-remove-button"
                  style={{ position: 'relative', top: 0, right: 0 }}
                >
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="comment-form-container">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="comment-textarea"
            disabled={submitting}
          />
          
          <div className="comment-actions-column">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
              disabled={submitting || !!selectedImage}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || !!selectedImage}
              className="action-button"
              title="Add image"
            >
              <Image className={`action-icon ${selectedImage ? 'active' : 'inactive'}`} />
            </button>

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={submitting || !!audioBlob}
              className={`action-button ${isRecording ? 'recording' : ''}`}
              title={isRecording ? 'Stop recording' : 'Record voice note'}
            >
              {isRecording ? (
                <StopCircle className="action-icon white" />
              ) : (
                <Mic className={`action-icon ${audioBlob ? 'active' : 'inactive'}`} />
              )}
            </button>

            <button
              type="submit"
              disabled={submitting || (!newComment.trim() && !selectedImage && !audioBlob)}
              className="action-button send"
              title="Send comment"
            >
              <Send className="action-icon white" />
            </button>
          </div>
        </div>

        {isRecording && (
          <div className="recording-indicator">
            <div className="recording-dot"></div>
            Recording... {formatRecordingTime(recordingTime)}
          </div>
        )}
      </form>
    </div>
  );
};

export default CommentSection;