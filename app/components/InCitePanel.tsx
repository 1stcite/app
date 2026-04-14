"use client";

import { computeInCite, inciteColor } from "@/app/lib/incite";

type Props = {
  talkId: string;
  inputs?: { views?: number; comments?: number; saves?: number };
};

function Bar({ value, color }: { value: number; color: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function InCitePanel({ talkId, inputs }: Props) {
  const score = computeInCite(talkId, inputs);
  const colors = inciteColor(score.composite);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">InCite Index</p>
          <p className="text-xs text-gray-400 mt-0.5">Composite engagement score</p>
        </div>
        <div className={`flex items-baseline gap-1 px-3 py-1.5 rounded-lg ring-1 ${colors.bg} ${colors.ring}`}>
          <span className={`text-3xl font-bold ${colors.text}`}>{score.composite}</span>
          <span className={`text-xs ${colors.text} opacity-60`}>/100</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Interest</span>
            <span className="text-gray-500 font-medium">{score.interest}</span>
          </div>
          <Bar value={score.interest} color="bg-blue-500" />
          <p className="text-[10px] text-gray-400 mt-0.5">Views, dwell time, geographic reach</p>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Interaction</span>
            <span className="text-gray-500 font-medium">{score.interaction}</span>
          </div>
          <Bar value={score.interaction} color="bg-purple-500" />
          <p className="text-[10px] text-gray-400 mt-0.5">Comments, saves, library adds</p>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600">Sentiment</span>
            <span className="text-gray-500 font-medium">{score.sentiment}</span>
          </div>
          <Bar value={score.sentiment} color="bg-emerald-500" />
          <p className="text-[10px] text-gray-400 mt-0.5">Comment valence and reaction quality</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
        <span className="text-gray-400">How is this computed?</span>
        <button className="text-blue-600 hover:underline">Methodology →</button>
      </div>
    </div>
  );
}
