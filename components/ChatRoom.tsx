import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { STUN_SERVERS } from '../constants';
import type { Peer, AllUsersPayload, UserJoinedPayload, OfferPayload, AnswerPayload, IceCandidatePayload } from '../hooks/types';
import PeerCard from './PeerCard';

// This is a global from the script tag in index.html
declare const io: (url: string) => Socket;

interface ChatRoomProps {
  roomId: string;
  localUsername: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, localUsername }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Connecting...');

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const addPeer = useCallback((peerId: string, peerUsername: string, stream?: MediaStream) => {
    setPeers(prev => new Map(prev).set(peerId, { id: peerId, username: peerUsername, stream, isMuted: false }));
  }, []);

  const removePeer = useCallback((peerId: string) => {
    peerConnectionsRef.current.get(peerId)?.close();
    peerConnectionsRef.current.delete(peerId);
    setPeers(prev => {
      const newPeers = new Map(prev);
      newPeers.delete(peerId);
      return newPeers;
    });
  }, []);
  
  const handleMuteToggle = useCallback(() => {
    if (localStream) {
      const enabled = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      setIsMuted(!enabled);
    }
  }, [localStream, isMuted]);

  useEffect(() => {
    const peerConnections = peerConnectionsRef.current;
    
    const createPeerConnection = (peerId: string, peerUsername: string, isInitiator: boolean, stream: MediaStream) => {
      if (peerConnections.has(peerId)) {
          console.warn('Peer connection already exists for', peerId);
          return;
      }
      const pc = new RTCPeerConnection(STUN_SERVERS);
      peerConnections.set(peerId, pc);
      addPeer(peerId, peerUsername);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('ice-candidate', { target: peerId, candidate: event.candidate });
        }
      };
      
      pc.ontrack = (event) => {
        console.log('Received remote track from', peerUsername, event.streams[0]);
        setPeers(prev => {
          const newPeers = new Map(prev);
          const peer = newPeers.get(peerId);
          if (peer) {
            const updatedPeer: Peer = { ...peer, stream: event.streams[0] };
            newPeers.set(peerId, updatedPeer);
          }
          return newPeers;
        });
      };
      
      pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
              setStatus('Connected');
              console.log(`Connection to ${peerUsername} is successful.`);
          }
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              console.log(`Connection to ${peerUsername} failed/disconnected.`);
              removePeer(peerId);
          }
      };

      if (isInitiator) {
          pc.createOffer()
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                  socketRef.current?.emit('offer', { target: peerId, sdp: pc.localDescription });
              })
              .catch(e => console.error("Error creating offer", e));
      }
    };


    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);
        setStatus('Initializing connection...');
        
        socketRef.current = io(window.location.origin);
        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Connected to signaling server');
            setStatus('Joining room...');
            socket.emit('join-room', { roomId, username: localUsername });
        });
        
        socket.on('all-users', (payload: AllUsersPayload) => {
          setStatus(payload.users.length > 0 ? 'Connecting to peers...' : 'Waiting for others...');
          console.log('Got all users:', payload.users);
          payload.users.forEach(user => {
            createPeerConnection(user.id, user.username, true, stream);
          });
        });

        socket.on('offer', async (payload: OfferPayload) => {
            console.log('Received offer from', payload.username);
            
            // This is the key change: create the connection if it doesn't exist.
            if (!peerConnections.has(payload.from)) {
              createPeerConnection(payload.from, payload.username, false, stream);
            }

            const pc = peerConnections.get(payload.from);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('answer', { target: payload.from, sdp: answer });
            }
        });
        
        socket.on('answer', async (payload: AnswerPayload) => {
            console.log('Received answer from peer');
            const pc = peerConnections.get(payload.from);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            }
        });

        socket.on('ice-candidate', async (payload: IceCandidatePayload) => {
            const pc = peerConnections.get(payload.from);
            if (pc && payload.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
        });

        socket.on('user-left', (payload: { id: string }) => {
            console.log('User left:', payload.id);
            removePeer(payload.id);
            if(peerConnections.size === 0) setStatus('Peer left. Waiting for others...');
        });
        
        socket.on('room-full', () => {
            setError("This room is full.");
            setStatus("Room is full");
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from signaling server');
            setStatus('Disconnected. Please refresh.');
        });
      
      } catch (err) {
        console.error('Error getting user media:', err);
        setError('Could not access microphone. Please check permissions and refresh.');
        setStatus('Error');
      }
    };

    init();

    return () => {
      console.log("Cleaning up ChatRoom component");
      localStream?.getTracks().forEach(track => track.stop());
      socketRef.current?.disconnect();
      peerConnections.forEach(pc => pc.close());
    };
  }, [roomId, localUsername, addPeer, removePeer]);

  if (error) {
    return <div className="text-center p-8 bg-red-900/50 rounded-lg"><h2 className="text-xl font-bold text-red-400">Error</h2><p>{error}</p></div>
  }
  
  const peerList = Array.from(peers.values());

  return (
    <div className="w-full h-full flex flex-col items-center justify-start p-4 max-w-6xl mx-auto">
        <div className="w-full mb-6 text-center">
            <h1 className="text-3xl font-bold text-cyan-300">Voice Chat Room</h1>
            <p className="text-sm font-mono text-gray-500 mt-1 break-all">Room ID: {roomId}</p>
            <p className="text-md text-gray-400 mt-2">{status}</p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            {localStream && (
                <PeerCard 
                    name={localUsername}
                    stream={localStream}
                    isMuted={isMuted}
                    isLocal={true}
                    onMuteToggle={handleMuteToggle}
                />
            )}
            {peerList.map(peer => (
                 <PeerCard 
                    key={peer.id}
                    name={peer.username}
                    stream={peer.stream || null}
                    isMuted={peer.isMuted}
                    isLocal={false}
                />
            ))}
        </div>
        {peerList.length === 0 && localStream && status !== 'Connecting...' && status !== 'Initializing connection...' &&
          <div className="mt-8 text-center p-8 bg-gray-800 rounded-xl">
            <p className="text-lg text-gray-300">You're the first one here!</p>
            <p className="text-sm text-gray-500 mt-2">Share the page URL to invite someone.</p>
          </div>
        }
    </div>
  );
};

export default ChatRoom;