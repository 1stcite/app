export type VisibilityType = "note" | "question" | "public";

export type CommentSubmitPayload = {
  text: string;
  visibilityType: VisibilityType;
};