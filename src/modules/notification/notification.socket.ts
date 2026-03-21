import { Server, Socket } from 'socket.io';

export const notificationSocket = (_io: Server, socket: Socket) => {
	socket.on('subscribe_notifications', (userId: number) => {
		socket.join(`notify_${userId}`);
	});
};
