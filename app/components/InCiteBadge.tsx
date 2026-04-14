"use client";

import { computeInCite, inciteColor } from "@/app/lib/incite";

type Props = {
  talkId: string;
  inputs?: { views?: number; comments?: number; saves?: number };
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
};

export default function InCiteBadge({ talkId, inputs, size = "sm", showLabel = false }: Props) {
  const score = computeInCite(talkId, inputs);
  const colors = inciteColor(score.composite);

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold ring-1 ${colors.bg} ${colors.text} ${colors.ring} ${sizeClasses}`}
      title={`InCite Index: ${score.composite}\nInterest: ${score.interest}\nInteraction: ${score.interaction}\nSentiment: ${score.sentiment > 0 ? "+" : ""}${score.sentiment}`}
    >
      {showLabel && <span className="opacity-70 font-normal">InCite</span>}
      <span>{score.composite}</span>
    </span>
  );
}
