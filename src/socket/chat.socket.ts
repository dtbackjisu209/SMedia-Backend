import { Server, Socket } from "socket.io";
import { ChatService } from "../services/chat.service.js";

const chatService = new ChatService();

export const chatSocket = (io: Server, socket: Socket) => {
    
    /**
     * Sự kiện: Người dùng yêu cầu bắt đầu chat với ai đó
     * Client gửi: { myId: number, targetUserId: number }
     */
    socket.on("join_private_chat", async (data: { myId: number, targetUserId: number }) => {
        try {
            const conversationId = await chatService.getOrCreateConversation(data.myId, data.targetUserId);
            
            // User join vào room riêng biệt của cuộc hội thoại này
            const roomName = `conversation_${conversationId}`;
            socket.join(roomName);

            console.log(`User ${data.myId} joined room: ${roomName}`);

            // Gửi lại conversationId cho client để client biết đang chat ở phòng nào
            socket.emit("joined_room", { conversationId });
        } catch (error) {
            console.error("Socket Join Room Error:", error);
            socket.emit("error", "Could not join chat room");
        }
    });

    /**
     * Sự kiện: Người dùng gửi tin nhắn
     * Client gửi: { conversationId: string, senderId: string, content: string }
     */
    socket.on("send_message", async (data: { conversationId: string, senderId: string, content: string }) => {
        try {
            if (!data.content.trim()) return;

            // 1. Lưu tin nhắn vào Database
            const savedMsg = await chatService.saveMessage(
                data.conversationId,
                data.senderId,
                data.content
            );

            // 2. Phát tin nhắn đến tất cả mọi người trong room (bao gồm cả người gửi và nhận)
            const roomName = `conversation_${data.conversationId}`;
            io.to(roomName).emit("new_message", savedMsg);

            console.log(`Message sent in room ${roomName}`);
        } catch (error) {
            console.error("Socket Send Message Error:", error);
        }
    });

    /**
     * Sự kiện: Đang gõ chữ (Typing...)
     */
    socket.on("typing", (data: { conversationId: string, senderName: string }) => {
        const roomName = `conversation_${data.conversationId}`;
        // Gửi cho tất cả mọi người trong phòng TRỪ người đang gõ
        socket.to(roomName).emit("user_typing", {
            message: `${data.senderName} đang soạn tin nhắn...`
        });
    });

    /**
     * Sự kiện: Dừng gõ chữ
     */
    socket.on("stop_typing", (data: { conversationId: string }) => {
        const roomName = `conversation_${data.conversationId}`;
        socket.to(roomName).emit("user_stop_typing");
    });
};