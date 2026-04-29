export type RecordingStatus = "pending" | "processing" | "done";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
      };
      recordings: {
        Row: {
          id: string;
          user_id: string;
          audio_url: string;
          transcript: string | null;
          status: RecordingStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          audio_url: string;
          transcript?: string | null;
          status?: RecordingStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          audio_url?: string;
          transcript?: string | null;
          status?: RecordingStatus;
          created_at?: string;
        };
      };
      analysis: {
        Row: {
          id: string;
          recording_id: string;
          tags: string[];
          motivation: string;
          personality: string;
          opening_script: string;
          selling_points: string[];
          objections: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          recording_id: string;
          tags: string[];
          motivation: string;
          personality: string;
          opening_script: string;
          selling_points: string[];
          objections: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          recording_id?: string;
          tags?: string[];
          motivation?: string;
          personality?: string;
          opening_script?: string;
          selling_points?: string[];
          objections?: string[];
          created_at?: string;
        };
      };
    };
  };
}
