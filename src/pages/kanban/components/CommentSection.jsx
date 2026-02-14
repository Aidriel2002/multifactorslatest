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

  // Close menu when clicking outside
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
      
      // Use a join to fetch comments with user data in one query
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

      // Format comments with user data
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
    return hoursDiff < 1; // Can edit within 1 hour
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
    
    // Allow comment with text, image, or voice note
    if (!newComment.trim() && !selectedImage && !audioBlob) {
      return; // Silently return if nothing to submit
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
      // Get the original comment
      const originalComment = comments.find(c => c.id === editingComment.id);
      
      // Try to save edit history (optional - will fail gracefully if table doesn't exist)
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
      } catch (historyError) {
        console.log('Edit history not available yet - run migration to enable this feature');
      }

      // Update the comment - only update the comment text
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
      // Delete associated files from storage
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

      // Try to delete edit history (optional)
      try {
        await supabase
          .from('comment_edit_history')
          .delete()
          .eq('comment_id', comment.id);
      } catch (e) {
        console.log('Edit history cleanup skipped');
      }

      // Delete comment
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
    <div className="border-t pt-4 sm:pt-6">
      <h4 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center text-base sm:text-lg">
        <MessageSquare size={18} className="mr-2 sm:w-5 sm:h-5" />
        Comments ({comments.length})
      </h4>

      {/* Comments List */}
      <div className="space-y-4 mb-4 max-h-80 sm:max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm sm:text-base">No comments yet</p>
        ) : (
          comments.map((comment) => {
            const isOwner = currentUser?.id === comment.user_id;
            const canEdit = canEditComment(comment.created_at);
            const isEdited = comment.edit_count > 0 || comment.last_edited_at;
            
            return (
              <div 
                key={comment.id} 
                className={`flex gap-2 ${isOwner ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar - Outside the bubble */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 ${isOwner ? 'bg-green-600' : 'bg-blue-600'} rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                  {comment.user?.name?.charAt(0).toUpperCase()}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-[75%] flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}>
                  {/* Name and Time - Outside the bubble */}
                  <div className={`flex items-center gap-2 mb-1 px-1 ${isOwner ? 'flex-row-reverse' : 'flex-row'}`}>
                    <p className="font-semibold text-gray-900 text-sm">{comment.user?.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(comment.created_at)}</p>
                  </div>

                  {/* Message Bubble */}
                  <div className="relative w-full">
                    <div className={`${isOwner ? 'bg-green-100' : 'bg-gray-100'} rounded-2xl p-3 sm:p-3.5 relative`}>
                      {/* Edited Badge */}
                      {isEdited && (
                        <button
                          onClick={() => loadEditHistory(comment.id)}
                          className="text-xs text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1 cursor-pointer"
                        >
                          <Clock size={10} />
                          <span>Edited</span>
                        </button>
                      )}

                      {/* Three Dots Menu */}
                      {isOwner && (
                        <div className="absolute top-2 right-2" ref={openMenuId === comment.id ? menuRef : null}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-white/50"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === comment.id && (
                            <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                              {canEdit && comment.comment && !comment.image_url && !comment.audio_url && (
                                <button
                                  onClick={() => {
                                    setEditingComment({ ...comment, originalComment: comment.comment });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit2 size={14} />
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteComment(comment)}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {editingComment?.id === comment.id ? (
                        <div className="mt-2">
                          <textarea
                            value={editingComment.comment}
                            onChange={(e) => setEditingComment({ ...editingComment, comment: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none resize-none text-sm"
                            rows="2"
                            autoFocus
                          />
                          <div className="flex justify-end space-x-2 mt-2">
                            <button
                              onClick={() => setEditingComment(null)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateComment}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {comment.comment && (
                            <p className="text-gray-700 text-sm whitespace-pre-wrap break-words pr-6">
                              {comment.comment}
                            </p>
                          )}
                          
                          {comment.image_url && (
                            <div className={comment.comment ? "mt-2" : ""}>
                              <img 
                                src={comment.image_url} 
                                alt="Comment attachment" 
                                className="max-w-full h-auto rounded-lg max-h-48 sm:max-h-64 object-cover cursor-pointer hover:opacity-90"
                                onClick={() => window.open(comment.image_url, '_blank')}
                              />
                            </div>
                          )}
                          
                          {comment.audio_url && (
                            <div className={comment.comment || comment.image_url ? "mt-2" : ""}>
                              <button
                                onClick={() => toggleAudioPlayback(comment.id, comment.audio_url)}
                                className={`flex items-center gap-2 px-3 py-2 ${isOwner ? 'bg-green-50 text-green-700 hover:bg-green-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} rounded-lg transition-colors text-sm`}
                              >
                                {playingAudio === comment.id ? (
                                  <Pause size={16} />
                                ) : (
                                  <Play size={16} />
                                )}
                                <span>Voice Note</span>
                              </button>
                            </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-lg">Edit History</h3>
              <button
                onClick={() => {
                  setShowEditHistory(null);
                  setEditHistory([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {editHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No edit history</p>
              ) : (
                editHistory.map((edit, index) => (
                  <div key={edit.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>{formatDate(edit.edited_at)}</span>
                      {index === 0 && <span className="text-blue-600 font-medium">(Previous version)</span>}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{edit.previous_comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="mt-4">
        {/* Preview Section */}
        {(imagePreview || audioBlob) && (
          <div className="mb-3 p-2 sm:p-3 bg-gray-50 rounded-lg space-y-2">
            {imagePreview && (
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-24 sm:max-h-32 rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}
            
            {audioBlob && (
              <div className="flex items-center gap-2 bg-blue-50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                <Mic size={14} className="text-blue-600 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm text-blue-700">Voice note ({formatRecordingTime(recordingTime)})</span>
                <button
                  type="button"
                  onClick={removeAudio}
                  className="ml-auto text-red-600 hover:text-red-700"
                >
                  <X size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none text-sm sm:text-base"
              rows="3"
              disabled={submitting}
            />
          </div>
          
          <div className="flex flex-col gap-1.5 sm:gap-2">
            {/* Image Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={submitting || !!selectedImage}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || !!selectedImage}
              className="p-1.5 sm:p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              title="Add image"
            >
              <Image size={18} className={`sm:w-5 sm:h-5 ${selectedImage ? 'text-blue-600' : 'text-gray-600'}`} />
            </button>

            {/* Voice Recording Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={submitting || !!audioBlob}
              className={`p-1.5 sm:p-2 border rounded-lg transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                isRecording 
                  ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              title={isRecording ? 'Stop recording' : 'Record voice note'}
            >
              {isRecording ? (
                <StopCircle size={18} className="sm:w-5 sm:h-5" />
              ) : (
                <Mic size={18} className={`sm:w-5 sm:h-5 ${audioBlob ? 'text-blue-600' : 'text-gray-600'}`} />
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={submitting || (!newComment.trim() && !selectedImage && !audioBlob)}
              className="p-1.5 sm:p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Send comment"
            >
              <Send size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {isRecording && (
          <div className="mt-2 text-xs sm:text-sm text-red-600 font-medium flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            Recording... {formatRecordingTime(recordingTime)}
          </div>
        )}
      </form>
    </div>
  );
};

export default CommentSection;