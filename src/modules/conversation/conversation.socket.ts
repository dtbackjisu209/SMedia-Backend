import { Server, Socket } from 'socket.io';
import { ChatService } from './conversation.service.js';

const chatService = new ChatService();
 
export const chatSocket = (io: Server, socket: Socket) => {

    /**
     * 1. SỰ KIỆN IDENTIFY 
     */
    socket.on('identify', async (userId: number) => {
        try {
            socket.join(`user_${userId}`);

            const userConvs = await chatService.getUserConversations(userId);
            
            userConvs.forEach((conv: any) => {
                socket.join(`conversation_${conv.conversation_id}`);
            });

            console.log(`[Socket] User ${userId} identified and joined ${userConvs.length} rooms`);
        } catch (error) {
            console.error('[Socket Error] identify:', error);
        }
    });

    /**
     * 2. CHAT 1-1: THAM GIA HOẶC TẠO CHAT RIÊNG
     */
    socket.on('join_private_chat', async (data: { myId: number; targetUserId: number }) => {
        try {
            const conversationId = await chatService.getOrCreateConversation(data.myId, data.targetUserId);
            const roomName = `conversation_${conversationId}`;
            
            socket.join(roomName);
            
            socket.emit('joined_room', { conversationId, type: 'private' });
            console.log(`[Socket] User ${data.myId} joined private chat: ${roomName}`);
        } catch (error) {
            console.error('[Socket Error] join_private_chat:', error);
            socket.emit('error', 'Không thể tham gia phòng chat riêng');
        }
    });

    /**
     * 3. CHAT NHÓM: TẠO NHÓM MỚI 
     */
    socket.on('create_group_chat', async (data: { name: string; memberIds: number[] }) => {
        try {
            // 1. Lưu nhóm vào Database
            const newGroup = await chatService.createGroupConversation(data.name, data.memberIds);
            const groupRoom = `conversation_${newGroup.id}`;
            
            // 2. PHẦN QUAN TRỌNG: Tự động "kéo" mọi người vào Room ngay lập tức
            data.memberIds.forEach((userId: number) => {
                // Lệnh này bắt tất cả socket đang Online của User đó Join vào Room nhóm
                io.in(`user_${userId}`).socketsJoin(groupRoom);

                // Sau đó gửi thông báo "Có nhóm mới" cho họ
                io.to(`user_${userId}`).emit('new_group_created', {
                    conversationId: newGroup.id,
                    name: data.name
                });
            });

            // 3. Người tạo cũng join vào (đã được xử lý ở vòng lặp trên nhưng cứ chắc chắn)
            socket.join(groupRoom);
            socket.emit('joined_room', { conversationId: newGroup.id, type: 'group' });
            
            console.log(`[Socket] Group ${data.name} created. All members automatically joined room ${groupRoom}`);
        } catch (error) {
            console.error('[Socket Error] create_group_chat:', error);
            socket.emit('error', 'Lỗi khi tạo nhóm chat');
        }
    });
    /**
     * 4. GỬI TIN NHẮN 
     */
    socket.on('send_message', async (data: { conversationId: string; senderId: string; content: string }) => {
        try {
            if (!data.content || !data.content.trim()) return;

            // 1. Lưu tin nhắn vào Database
            const savedMsg = await chatService.saveMessage(
                data.conversationId,
                data.senderId,
                data.content
            );

            // 2. Phát tin nhắn đến toàn bộ người trong phòng hội thoại
            const roomName = `conversation_${data.conversationId}`;
            io.to(roomName).emit('new_message', savedMsg);
            
            console.log(`[Socket] Message sent in ${roomName} by User ${data.senderId}`);
        } catch (error) {
            console.error('[Socket Error] send_message:', error);
            socket.emit('error', 'Không thể gửi tin nhắn');
        }
    });

    /**
     * 5. HIỆU ỨNG TYPING (Đang soạn tin nhắn)
     */
    socket.on('typing', (data: { conversationId: string; senderName: string }) => {
        const roomName = `conversation_${data.conversationId}`;
        socket.to(roomName).emit('user_typing', {
            message: `${data.senderName} đang soạn tin nhắn...`
        });
    });

    /**
     * 6. DỪNG SOẠN TIN NHẮN
     */
    socket.on('stop_typing', (data: { conversationId: string }) => {
        const roomName = `conversation_${data.conversationId}`;
        socket.to(roomName).emit('user_stop_typing');
    });
};