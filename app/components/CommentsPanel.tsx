'use client';

import React, { useState } from 'react';

export type Comment = {
  _id?: string;
  id?: string;
  posterId: string;
  page: number;
  text: string;
  author?: string;
  userId?: string;
  parentId?: string;
  timestamp: Date;
};

function getId(c: Comment) {
  return c._id || c.id || `${c.posterId}-${c.page}-${c.timestamp.toISOString()}`;
}

type CommentsPanelProps = {
  compactHeader?: boolean;
  page: number;
  numPages: number;
  loading: boolean;
  comments: Comment[];
  sessionUserId?: string;
  onOpenAdd: () => void;
  onDelete: (c: Comment) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
};

function CommentThread({
  comment,
  replies,
  sessionUserId,
  onDelete,
  onReply,
}: {
  comment: Comment;
  replies: Comment[];
  sessionUserId?: string;
  onDelete: (c: Comment) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReply(getId(comment), replyText.trim());
    setReplyText('');
    setReplying(false);
    setSubmitting(false);
  }

  return (
    <div className="space-y-1">
      {/* Parent comment */}
      <div className="rounded border border-gray-200 bg-gray-50 p-2">
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span className="font-medium">{comment.author || 'Anonymous'}</span>
          <span>{(comment.timestamp instanceof Date ? comment.timestamp : new Date(comment.timestamp as any)).toLocaleString()}</span>
        </div>
        <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{comment.text}</div>
        <div className="mt-2 flex items-center justify-between">
          {sessionUserId ? (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setReplying(!replying)}
            >
              {replying ? 'Cancel' : 'Reply'}
            </button>
          ) : <span />}
          {sessionUserId && String(comment.userId) === String(sessionUserId) && (
            <button
              type="button"
              className="text-xs text-red-700 hover:underline"
              onClick={() => onDelete(comment)}
            >
              Delete
            </button>
          )}
        </div>

        {/* Inline reply box */}
        {replying && (
          <div className="mt-2 space-y-1">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 text-gray-900 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              disabled={submitting || !replyText.trim()}
              onClick={submitReply}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40"
            >
              {submitting ? 'Posting…' : 'Post reply'}
            </button>
          </div>
        )}
      </div>

      {/* Replies — indented */}
      {replies.length > 0 && (
        <div className="ml-4 space-y-1 border-l-2 border-blue-100 pl-2">
          {replies.map((reply) => (
            <div key={getId(reply)} className="rounded border border-gray-200 bg-white p-2">
              <div className="text-xs text-gray-500 flex items-center justify-between">
                <span className="font-medium">{reply.author || 'Anonymous'}</span>
                <span>{(reply.timestamp instanceof Date ? reply.timestamp : new Date(reply.timestamp as any)).toLocaleString()}</span>
              </div>
              <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{reply.text}</div>
              {sessionUserId && String(reply.userId) === String(sessionUserId) && (
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-red-700 hover:underline"
                    onClick={() => onDelete(reply)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentsPanel({
  page,
  loading,
  comments,
  sessionUserId,
  onOpenAdd,
  onDelete,
  onReply,
}: CommentsPanelProps) {
  // Split into top-level and replies
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => !!c.parentId);

  const repliesFor = (parentId: string) =>
    replies.filter((r) => r.parentId === parentId);

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-white px-3 py-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">
          Comments <span className="text-gray-500 font-normal">({topLevel.length})</span>
        </div>
        <button
          type="button"
          onClick={onOpenAdd}
          className="px-2 py-1.5 rounded bg-blue-600 text-white text-sm"
        >
          Add
        </button>
      </div>

      {/* Scroll area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2"
        style={{ scrollbarGutter: 'stable', overflowAnchor: 'none' }}
      >
        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : topLevel.length === 0 ? (
          <div className="text-sm text-gray-600">No comments yet.</div>
        ) : (
          <div className="space-y-3">
            {topLevel.map((c) => (
              <CommentThread
                key={getId(c)}
                comment={c}
                replies={repliesFor(getId(c))}
                sessionUserId={sessionUserId}
                onDelete={onDelete}
                onReply={onReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
