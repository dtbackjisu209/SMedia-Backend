import { Server, Socket } from 'socket.io';
import { ChatService } from './conversation.service.js';
import notificationService from '../notification/notification.service.js';

const chatService = new ChatService();

const getOnlineUserIds = (io: Server): number[] => {
  const roomNames = Array.from(io.sockets.adapter.rooms.keys());
  return roomNames
    .filter((room) => room.startsWith('user_'))
    .map((room) => Number(room.replace('user_', '')))
    .filter((id) => Number.isFinite(id) && id > 0);
};

const hasRecipientOpenedConversation = async (
  io: Server,
  recipientId: number,
  conversationId: string,
): Promise<boolean> => {
  const sockets = await io.in(`user_${recipientId}`).fetchSockets();
  return sockets.some((recipientSocket) => String(recipientSocket.data.activeConversationId ?? '') === conversationId);
};

export const chatSocket = (io: Server, socket: Socket) => {
  socket.on('identify', async (userId: number) => {
    try {
      const normalizedUserId = Number(userId);
      if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) return;

      const userRoom = `user_${normalizedUserId}`;
      const isAlreadyOnline = (io.sockets.adapter.rooms.get(userRoom)?.size ?? 0) > 0;

      socket.data.userId = normalizedUserId;
      socket.join(userRoom);

      const userConvs = await chatService.getUserConversations(normalizedUserId);
      userConvs.forEach((conv: any) => {
        socket.join(`conversation_${conv.id}`);
      });

      socket.emit('presence_snapshot', { onlineUserIds: getOnlineUserIds(io) });

      if (!isAlreadyOnline) {
        io.emit('user_presence_changed', { userId: normalizedUserId, isOnline: true });
        io.emit('presence_snapshot', { onlineUserIds: getOnlineUserIds(io) });
      }

      console.log(`[Socket] User ${normalizedUserId} identified and joined ${userConvs.length} rooms`);
    } catch (error) {
      console.error('[Socket Error] identify:', error);
    }
  });

  socket.on('set_active_conversation', (data: { conversationId: string | null }) => {
    socket.data.activeConversationId = data?.conversationId ? String(data.conversationId) : null;
  });

  socket.on('join_private_chat', async (data: { myId: number; targetUserId: number }) => {
    try {
      const conversationId = await chatService.getOrCreateConversation(data.myId, data.targetUserId);
      const roomName = `conversation_${conversationId}`;

      socket.join(roomName);
      io.in(`user_${data.targetUserId}`).socketsJoin(roomName);

      socket.emit('joined_room', { conversationId, type: 'private' });
      console.log(`[Socket] User ${data.myId} joined private chat: ${roomName}`);
    } catch (error) {
      console.error('[Socket Error] join_private_chat:', error);
      socket.emit('error', 'Could not join private chat room');
    }
  });

  socket.on('create_group_chat', async (data: { name: string; memberIds: number[] }) => {
    try {
      const newGroup = await chatService.createGroupConversation(data.name, data.memberIds);
      const groupRoom = `conversation_${newGroup.id}`;

      data.memberIds.forEach((userId: number) => {
        io.in(`user_${userId}`).socketsJoin(groupRoom);
        io.to(`user_${userId}`).emit('new_group_created', {
          conversationId: newGroup.id,
          name: data.name,
        });
      });

      socket.join(groupRoom);
      socket.emit('joined_room', { conversationId: newGroup.id, type: 'group' });

      console.log(`[Socket] Group ${data.name} created, room ${groupRoom}`);
    } catch (error) {
      console.error('[Socket Error] create_group_chat:', error);
      socket.emit('error', 'Could not create group chat');
    }
  });

  socket.on(
    'send_message',
    async (data: { conversationId: string; senderId: string; content: string; replyToMessageId?: string | null }) => {
    try {
      if (!data.content || !data.content.trim()) return;

      const savedMsg = await chatService.saveMessage(
        data.conversationId,
        data.senderId,
        data.content,
        data.replyToMessageId ?? null,
      );
      const roomName = `conversation_${data.conversationId}`;
      io.to(roomName).emit('new_message', savedMsg);

      const senderId = Number(data.senderId);
      const memberIds = await chatService.getConversationMemberIds(data.conversationId);
      const recipientIds = memberIds.filter((memberId) => memberId !== senderId);

      await Promise.all(
        recipientIds.map(async (recipientId) => {
          const isMuted = await chatService.isConversationMutedForUser(data.conversationId, recipientId);
          if (isMuted) return;

          const isReadingThisConversation = await hasRecipientOpenedConversation(io, recipientId, data.conversationId);
          if (isReadingThisConversation) return;

          return notificationService.createNotification({
            userId: recipientId,
            actorId: senderId,
            type: 'message',
            referenceId: Number(data.conversationId),
            content: `${savedMsg.sender_name} đã nhắn tin cho bạn, nhấn vào để xem chi tiết.`,
          });
        }),
      );

      console.log(`[Socket] Message sent in ${roomName} by User ${data.senderId}`);
    } catch (error) {
      console.error('[Socket Error] send_message:', error);
      socket.emit('error', 'Could not send message');
    }
  },
  );

  socket.on(
    'delete_message',
    async (
      data: { messageId: string; userId: string; mode: 'self' | 'everyone' },
      ack?: (payload: { success: boolean; message?: string }) => void,
    ) => {
    try {
      if (!data?.messageId || !data?.userId || !data?.mode) {
        ack?.({ success: false, message: 'Invalid delete message payload' });
        return;
      }

      if (data.mode === 'self') {
        const result = await chatService.deleteMessageForSelf(data.messageId, data.userId);
        socket.emit('message_deleted', result);
        ack?.({ success: true });
        return;
      }

      const result = await chatService.recallMessageForEveryone(data.messageId, data.userId);
      io.to(`conversation_${result.conversationId}`).emit('message_deleted', result);
      ack?.({ success: true });
    } catch (error) {
      console.error('[Socket Error] delete_message:', error);
      const message = error instanceof Error ? error.message : 'Could not delete message';
      socket.emit('chat_error', message);
      ack?.({ success: false, message });
    }
  },
  );

  socket.on(
    'toggle_message_reaction',
    async (
      data: { messageId: string; userId: string; emoji: string },
      ack?: (payload: { success: boolean; message?: string }) => void,
    ) => {
    try {
      if (!data?.messageId || !data?.userId || !data?.emoji) {
        ack?.({ success: false, message: 'Invalid reaction payload' });
        return;
      }

      const result = await chatService.toggleMessageReaction(data.messageId, data.userId, data.emoji);
      io.to(`conversation_${result.conversationId}`).emit('message_reaction_updated', result);
      ack?.({ success: true });
    } catch (error) {
      console.error('[Socket Error] toggle_message_reaction:', error);
      const message = error instanceof Error ? error.message : 'Could not update reaction';
      socket.emit('chat_error', message);
      ack?.({ success: false, message });
    }
  },
  );

  socket.on('typing', (data: { conversationId: string; senderName: string }) => {
    const roomName = `conversation_${data.conversationId}`;
    socket.to(roomName).emit('user_typing', {
      conversationId: String(data.conversationId),
      message: `${data.senderName} is typing...`,
    });
  });

  socket.on('stop_typing', (data: { conversationId: string }) => {
    const roomName = `conversation_${data.conversationId}`;
    socket.to(roomName).emit('user_stop_typing', {
      conversationId: String(data.conversationId),
    });
  });

  socket.on('request_presence_snapshot', () => {
    socket.emit('presence_snapshot', { onlineUserIds: getOnlineUserIds(io) });
  });

  socket.on('disconnect', () => {
    const userId = Number(socket.data.userId);
    if (!Number.isFinite(userId) || userId <= 0) return;

    setTimeout(() => {
      const stillOnline = (io.sockets.adapter.rooms.get(`user_${userId}`)?.size ?? 0) > 0;
      if (!stillOnline) {
        io.emit('user_presence_changed', { userId, isOnline: false });
        io.emit('presence_snapshot', { onlineUserIds: getOnlineUserIds(io) });
      }
    }, 0);
  });
};
