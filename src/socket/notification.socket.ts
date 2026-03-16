// src/socket/notification.socket.ts
import { Server, Socket } from "socket.io";

export const notificationSocket = (io: Server, socket: Socket) => {
    // Logic cho thông báo (like, comment, follow...)
    socket.on("subscribe_notifications", (userId: number) => {
        socket.join(`notify_${userId}`);
    });
};