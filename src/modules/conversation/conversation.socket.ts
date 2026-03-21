import { Server, Socket } from 'socket.io';
import { ChatService } from './conversation.service.js';

const chatService = new ChatService();

export const chatSocket = (io: Server, socket: Socket) => {
	socket.on('join_private_chat', async (data: { myId: number; targetUserId: number }) => {
		try {
			const conversationId = await chatService.getOrCreateConversation(data.myId, data.targetUserId);
			const roomName = `conversation_${conversationId}`;
			socket.join(roomName);
			socket.emit('joined_room', { conversationId });
		} catch (error) {
			console.error('Socket Join Room Error:', error);
			socket.emit('error', 'Could not join chat room');
		}
	});

	socket.on(
		'send_message',
		async (data: { conversationId: string; senderId: string; content: string }) => {
			try {
				if (!data.content.trim()) {
					return;
				}

				const savedMsg = await chatService.saveMessage(
					data.conversationId,
					data.senderId,
					data.content,
				);

				const roomName = `conversation_${data.conversationId}`;
				io.to(roomName).emit('new_message', savedMsg);
			} catch (error) {
				console.error('Socket Send Message Error:', error);
			}
		},
	);

	socket.on('typing', (data: { conversationId: string; senderName: string }) => {
		const roomName = `conversation_${data.conversationId}`;
		socket.to(roomName).emit('user_typing', {
			message: `${data.senderName} đang soạn tin nhắn...`,
		});
	});

	socket.on('stop_typing', (data: { conversationId: string }) => {
		const roomName = `conversation_${data.conversationId}`;
		socket.to(roomName).emit('user_stop_typing');
	});
};
