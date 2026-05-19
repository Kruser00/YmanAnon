export interface UserProfile {
  name: string;
  [key: string]: any;
}

export interface UserState {
  points: number;
  reputation: {
    positive: number;
    negative: number;
  };
}

export interface MessagePayload {
  id: string;
  sender: string;
  text: string;
  image?: string;
  timestamp: number;
  boost?: string;
}

export interface RoomStats {
  duration: number;
  rank: string;
  messageCount: number;
}
