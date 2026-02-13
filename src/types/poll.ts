import type { Tables } from './database';

export type TripPoll = Tables<'trip_polls'>;
export type PollVote = Tables<'poll_votes'>;

export interface PollOption {
  text: string;
}

export interface PollWithVotes extends Omit<TripPoll, 'options'> {
  options: PollOption[];
  votes: PollVote[];
  users: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  voteCounts: number[];
  totalVotes: number;
  userVotes: number[];
  isClosed: boolean;
}

export interface CreatePollInput {
  trip_id: string;
  question: string;
  options: string[];
  allow_multiple?: boolean;
  closes_at?: string;
}
