export interface Message {
  sender: "ai" | "user";
  text?: string;
  type?: "text" | "voice" | "image" | "video";
  duration?: string;
  imageUrl?: string;
  videoUrl?: string;
  time: string;
  timestamp?: number;
}

export interface Character {
  id: string;
  slug: string;
  name: string;
  age: number;
  gender: "female" | "male";
  style: "realistic" | "anime";
  tagline: string;
  desc: string;
  image: string;
  badge?: string;
  category: string;
  series: boolean;
  verified: boolean;
  online: boolean;
  tags: string[];
  voice: string;
  greeting: string;
  videoUrl?: string;
  gallery?: string[];
  messages: Message[];
}
