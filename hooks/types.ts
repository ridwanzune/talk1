
import type { Socket } from 'socket.io-client';

export interface Peer {
  id: string;
  username: string;
  stream?: MediaStream;
  isMuted: boolean;
}

// Payloads for socket events
export interface AllUsersPayload {
  users: { id: string; username: string }[];
}

export interface UserJoinedPayload {
  id: string;
  username: string;
}

export interface OfferPayload {
  from: string;
  username: string;
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerPayload {
  from: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  from: string;
  candidate: RTCIceCandidateInit;
}
