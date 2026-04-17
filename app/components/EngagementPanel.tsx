"use client";

import { computeEngagement } from "@/app/lib/engagement";

type Props = {
  talkId: string;
};

export default function EngagementPanel({ talkId }: Props) {
  const data = computeEngagement(talkId);

  // Mock attended split — will be real once save records have attended flag
  const attendedSaves = Math.round(data.saves * 0.66);
  const archiveSaves = data.saves - attendedSaves;

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
        <span
          className="text-gray-900"
          style={{ fontSize: "28px", fontWeight: 600, lineHeight: 1.1 }}
        >
          {data.engagement.toLocaleString()}
        </span>
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
      </div>

      {/* Saves with attended breakdown */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Saves</span>
          <span className="font-medium text-gray-900">{data.saves}</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {attendedSaves} attended
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
            {archiveSaves} archive-only
          </span>
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
