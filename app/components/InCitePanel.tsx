"use client";

import { computeInCite } from "@/app/lib/incite";
import InCiteBadge from "@/app/components/InCiteBadge";

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">InCite Index</p>
          <p className="text-xs text-gray-400 mt-0.5">Two-axis engagement metric</p>
          <div className="flex gap-4 mt-2 text-sm">
            <div>
              <span className="text-gray-500">Engagement</span>{" "}
              <span className="font-bold text-emerald-700">{score.engagement}</span>
            </div>
            <div>
              <span className="text-gray-500">Sentiment</span>{" "}
              <span className="font-bold text-emerald-700">{score.sentiment}</span>
            </div>
          </div>
        </div>
        <InCiteBadge talkId={talkId} inputs={inputs} size="lg" />
      </div>

      <div className="space-y-3 pt-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Engagement breakdown</p>
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

        <div className="pt-2">
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
