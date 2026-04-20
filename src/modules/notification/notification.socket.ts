import { Server, Socket } from 'socket.io';
import type { NotificationItemDto } from './notification.dto.js';

let notificationIo: Server | null = null;

export const notificationSocket = (_io: Server, socket: Socket) => {
	notificationIo = _io;
	socket.on('subscribe_notifications', (userId: number) => {
		socket.join(`notify_${userId}`);
	});
};

export const emitNotificationToUser = (userId: number, notification: NotificationItemDto) => {
	if (!notificationIo || !Number.isFinite(userId) || userId <= 0) return;
	notificationIo.to(`notify_${userId}`).emit('new_notification', notification);
};
