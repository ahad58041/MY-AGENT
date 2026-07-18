export interface Captions {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  youtube_title?: string;
  youtube_description?: string;
}

export interface Upload {
  id: number;
  filename: string;
  stored_path: string;
  generic_caption: string;
  context: string | null;
  captions: Captions;
  publish_status: Record<string, string>;
  subtitled_path: string | null;
  transcript: string | null;
  created_at: string;
}

export interface Connection {
  id: string;
  name: string;
  provider: string;
  picture: string | null;
}

export interface PublishResult {
  integration_id: string;
  provider: string;
  ok: boolean;
  detail: string | null;
}

export interface PublishResponse {
  results: PublishResult[];
  publish_status: Record<string, string>;
}

export const PLATFORMS = [
  { key: "instagram", label: "Instagram Reels", color: "#E11D48" },
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { key: "youtube", label: "YouTube Shorts", color: "#FF0000" },
  { key: "facebook", label: "Facebook", color: "#1877F2" },
] as const;
