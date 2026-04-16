"use client";

import { computeEngagement } from "@/app/lib/engagement";

type Props = {
  talkId: string;
};

export default function EngagementPanel({ talkId }: Props) {
  const data = computeEngagement(talkId);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Engagement
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            scheduled + saves × 2 + comments × 3
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span
            className="text-gray-900"
            style={{ fontSize: "28px", fontWeight: 600, lineHeight: 1.1 }}
          >
            {data.engagement.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 mt-1">
            <span className="text-blue-600 text-sm font-medium">
              {data.thumbsUp}
            </span>
            <svg
              className="text-blue-600"
              style={{ width: "14px", height: "14px" }}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zm4-.167v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.556 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-3 border-t border-gray-100 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Viewers</span>
          <span className="font-medium text-gray-900">{data.viewers}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Median view time</span>
          <span className="font-medium text-gray-900">{data.medianViewTimeMin} m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Commenters</span>
          <span className="font-medium text-gray-900">{data.commenters}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Comments</span>
          <span className="font-medium text-gray-900">{data.comments}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Saves</span>
          <span className="font-medium text-gray-900">{data.saves}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 text-xs">
        <a href="/methodology" className="text-blue-600 hover:underline">
          How is this computed? →
        </a>
      </div>
    </div>
  );
}
