import { useTranslation } from "../utils/translations";
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Phone, Video, Image, Smile, Trash2, UserX, PhoneOff } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { apiClient, createWebSocketUrl } from '../services/api';
import { storageService } from '../services/storage';
import { authService } from '../utils/auth';
import { useNotification } from '../components/NotificationContainer';
import type { Match, Message, Profile } from '../types/api';
import './Chat.css';

interface ChatMessage {
  id: string;
  sender: 'me' | 'partner';
  text: string;
  timestamp: Date;
  read?: boolean;
}

interface CachedChatMessage {
  id: string;
  sender: 'me' | 'partner';
  text: string;
  timestamp: string;
}

export const Chat: React.FC = () => {
  const t = useTranslation();
  const { id: matchId } = useParams();
  const currentUserId = storageService.getUser()?.id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [partnerName, setPartnerName] = useState('Chat');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'in-call' | 'error'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const notify = useNotification();

  const getCacheKey = (activeMatchId: string) => `chat_cache_${currentUserId}_${activeMatchId}`;

  const loadCachedMessages = (activeMatchId: string) => {
    const cached = localStorage.getItem(getCacheKey(activeMatchId));
    if (!cached) return null;
    try {
      const payload = JSON.parse(cached) as { savedAt?: number; messages?: CachedChatMessage[] };
      if (!payload.savedAt || Date.now() - payload.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(getCacheKey(activeMatchId));
        return null;
      }
      if (!Array.isArray(payload.messages)) return null;
      return payload.messages.map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      })) as ChatMessage[];
    } catch {
      return null;
    }
  };

  const saveCachedMessages = (activeMatchId: string, data: ChatMessage[]) => {
    const payload: CachedChatMessage[] = data.map((message) => ({
      id: message.id,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp.toISOString(),
    }));
    localStorage.setItem(
      getCacheKey(activeMatchId),
      JSON.stringify({ savedAt: Date.now(), messages: payload })
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    const activeMatchId = matchId;
    const cachedMessages = loadCachedMessages(activeMatchId);
    if (cachedMessages && cachedMessages.length > 0) {
      setMessages(cachedMessages);
    }

    async function loadChat() {
      const [messagesResponse, matchesResponse] = await Promise.all([
        apiClient.getMessages(activeMatchId),
        apiClient.getMatches(),
      ]);

      const messagePayload = messagesResponse.data as { data?: Message[] } | undefined;
      const matchPayload = matchesResponse.data as { data?: Match[] } | undefined;
      const currentMatch = matchPayload?.data?.find((match) => match.id === activeMatchId);

      if (currentMatch) {
        const profileResponse = await apiClient.getProfileById(currentMatch.userId);
        const profile = profileResponse.data as Profile | undefined;
        setPartnerName(profile?.firstName || 'Chat');
        setPartnerId(profile?.id || currentMatch.userId || null);
      }

      const serverMessages = Array.isArray(messagePayload?.data) ? messagePayload?.data : null;
      if (serverMessages) {
        const mapped: ChatMessage[] = serverMessages.map((message): ChatMessage => ({
          id: message.id,
          sender: message.senderId === currentUserId ? 'me' : 'partner',
          text: message.text,
          timestamp: new Date(message.createdAt),
          read: message.read,
        }));
        setMessages(mapped);
        saveCachedMessages(activeMatchId, mapped);
      }

      // Mark partner messages as read after loading chat
      await apiClient.markMessagesRead(activeMatchId);

      if (partnerId) {
        const blockedResponse = await apiClient.getBlockedUsers();
        const blockedList = (blockedResponse.data as { data?: string[] } | undefined)?.data || [];
        setIsBlocked(blockedList.includes(partnerId));
      }
    }

    void loadChat();
  }, [currentUserId, matchId]);

  useEffect(() => {
    if (!matchId) return;
    if (messages.length === 0) return;
    saveCachedMessages(matchId, messages);
  }, [messages, matchId]);

  useEffect(() => {
    return () => {
      void endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIceServers = () => {
    const raw = import.meta.env.VITE_RTC_ICE_SERVERS;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // ignore malformed config
      }
    }
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  };

  const setupPeerConnection = async (type: 'audio' | 'video') => {
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    peerRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: 'candidate',
            matchId,
            data: event.candidate,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(event.track);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    const mediaConstraints = {
      audio: true,
      video: type === 'video',
    };
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    localStreamRef.current = stream;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!matchId || callStatus === 'connecting' || callStatus === 'in-call') {
      return;
    }

    setCallType(type);
    setCallOpen(true);
    setCallStatus('connecting');
    setCallError(null);

    try {
      await setupPeerConnection(type);

      const token = authService.getToken();
      const ws = new WebSocket(createWebSocketUrl('/ws/calls', token || ''));
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', matchId }));
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'ready') {
          if (message.role === 'caller') {
            const offer = await peerRef.current?.createOffer();
            if (offer) {
              await peerRef.current?.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: 'offer', matchId, data: offer }));
            }
          }
          setCallStatus('in-call');
        }

        if (message.type === 'offer') {
          await peerRef.current?.setRemoteDescription(message.data);
          const answer = await peerRef.current?.createAnswer();
          if (answer) {
            await peerRef.current?.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', matchId, data: answer }));
          }
          setCallStatus('in-call');
        }

        if (message.type === 'answer') {
          await peerRef.current?.setRemoteDescription(message.data);
          setCallStatus('in-call');
        }

        if (message.type === 'candidate') {
          if (message.data) {
            try {
              await peerRef.current?.addIceCandidate(message.data);
            } catch {
              // ignore candidate errors
            }
          }
        }

        if (message.type === 'hangup') {
          await endCall();
        }

        if (message.type === 'error') {
          setCallError(message.message || 'Verbindung fehlgeschlagen.');
          setCallStatus('error');
        }
      };

      ws.onclose = () => {
        if (callStatus !== 'idle') {
          void endCall();
        }
      };

      ws.onerror = () => {
        setCallError('Verbindung fehlgeschlagen.');
        setCallStatus('error');
      };
    } catch (error) {
      console.error('Call error', error);
      setCallError('Kamera/Mikrofon konnte nicht gestartet werden.');
      setCallStatus('error');
    }
  };

  const endCall = async () => {
    if (wsRef.current && matchId) {
      wsRef.current.send(JSON.stringify({ type: 'hangup', matchId }));
      wsRef.current.close();
    }
    wsRef.current = null;

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setCallStatus('idle');
    setCallOpen(false);
    setCallType(null);
  };

  const handleSendMessage = async () => {
    if (!matchId || inputValue.trim() === '') {
      return;
    }

    const response = await apiClient.sendMessage(matchId, inputValue.trim());
    const newMessage = response.data as Message | undefined;

    if (!newMessage) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: newMessage.id,
        sender: newMessage.senderId === currentUserId ? 'me' : 'partner',
        text: newMessage.text,
        timestamp: new Date(newMessage.createdAt),
        read: newMessage.read,
      },
    ]);
    setInputValue('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    const confirmDelete = window.confirm('Nachricht wirklich löschen?');
    if (!confirmDelete) {
      return;
    }

    const response = await apiClient.deleteMessage(messageId);
    if (response.error) {
      notify.error('Nachricht konnte nicht gelöscht werden.');
      return;
    }
    setMessages((currentMessages) => currentMessages.filter((msg) => msg.id !== messageId));
    notify.success('Nachricht gelöscht.');
  };

  const handleBlockUser = async () => {
    if (!partnerId) {
      notify.error('Kein Benutzer gefunden.');
      return;
    }
    const confirmBlock = window.confirm('Diesen Nutzer blockieren?');
    if (!confirmBlock) {
      return;
    }
    const response = await apiClient.blockUser(partnerId);
    if (response.error) {
      notify.error('Blockieren fehlgeschlagen.');
      return;
    }
    setIsBlocked(true);
    notify.success('Nutzer blockiert.');
  };

  const handleUnblockUser = async () => {
    if (!partnerId) {
      notify.error('Kein Benutzer gefunden.');
      return;
    }
    const confirmUnblock = window.confirm('Blockierung aufheben?');
    if (!confirmUnblock) {
      return;
    }
    const response = await apiClient.unblockUser(partnerId);
    if (response.error) {
      notify.error('Entblocken fehlgeschlagen.');
      return;
    }
    setIsBlocked(false);
    notify.success('Nutzer entblockt.');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <MainLayout>
      <div className="chat-container">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">{partnerName.charAt(0).toUpperCase()}</div>
            <div className="chat-header-text">
              <h2>{partnerName}</h2>
              <span className="chat-status online">Live Chat</span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              className="chat-header-btn"
              title="Video-Call"
              aria-label="Video Call"
              onClick={() => void startCall('audio')}
            >
              <Phone size={20} />
            </button>
            <button
              className="chat-header-btn"
              title="Video Call"
              aria-label="Start Video"
              onClick={() => void startCall('video')}
            >
              <Video size={20} />
            </button>
            {callOpen && (
              <button
                className="chat-hangup-icon"
                title={t("Auflegen")}
                aria-label={t("Auflegen")}
                onClick={() => void endCall()}
              >
                <PhoneOff size={18} />
              </button>
            )}
            <button
              className="chat-header-btn"
              title={t("Blockieren")}
              aria-label={t("Blockieren")}
              onClick={handleBlockUser}
            >
              <UserX size={20} />
            </button>
            {isBlocked && (
              <button
                className="chat-header-btn"
                title={t("Entblocken")}
                aria-label={t("Entblocken")}
                onClick={handleUnblockUser}
              >
                {t("Entblocken")}
              </button>
            )}
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'me' ? 'sent' : 'received'}`}
            >
              <div className="message-bubble">
                {message.text}
                {message.sender === 'me' && (
                  <span className="message-read">
                    {message.read ? 'Gelesen' : 'Gesendet'}
                  </span>
                )}
              </div>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {message.sender === 'me' && (
                <button
                  className="message-delete"
                  onClick={() => void handleDeleteMessage(message.id)}
                  aria-label={t("Nachricht löschen")}
                  title={t("Nachricht löschen")}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-actions">
            <button
              className="chat-action-btn"
              title="Send Image"
              aria-label="Send Image"
            >
              <Image size={20} />
            </button>
            <button
              className="chat-action-btn"
              title="Emoji"
              aria-label="Emoji"
            >
              <Smile size={20} />
            </button>
          </div>

          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              placeholder={t("Schreib eine Nachricht...")}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={1}
              disabled={isBlocked}
            />
          </div>

          <button
            className="chat-send-btn"
            onClick={() => void handleSendMessage()}
            disabled={inputValue.trim() === '' || isBlocked}
            title="Send"
            aria-label="Send Message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {callOpen && (
        <div className="call-overlay">
          <div className="call-panel">
            <div className="call-header">
              <div>
                <h3>{callType === 'video' ? 'Video Call' : 'Audio Call'}</h3>
                <span>
                  {callStatus === 'connecting' && 'Verbinde...'}
                  {callStatus === 'in-call' && 'Verbunden'}
                  {callStatus === 'error' && (callError || 'Fehler')}
                </span>
              </div>
              <button className="call-end-btn" onClick={() => void endCall()}>
                {callStatus === 'connecting' ? 'Abbrechen' : t("Auflegen")}
              </button>
            </div>

            <div className={`call-media ${callType === 'audio' ? 'audio-only' : ''}`}>
              <video ref={remoteVideoRef} autoPlay playsInline />
              <video ref={localVideoRef} autoPlay playsInline muted />
              {callType === 'audio' && (
                <div className="call-audio-placeholder">
                  <div className="call-avatar">{partnerName.charAt(0).toUpperCase()}</div>
                  <p>{partnerName}</p>
                </div>
              )}
            </div>
            <div className="call-actions">
              <button className="call-end-btn call-end-primary" onClick={() => void endCall()}>
                {callStatus === 'connecting' ? 'Abbrechen' : t("Auflegen")}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Chat;
