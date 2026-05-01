import { Server, Socket } from 'socket.io';
import type { NotificationItemDto } from './notification.dto.js';
import type { CommentItemDTO } from '../comment/comment.dto.js';

let notificationIo: Server | null = null;

export const notificationSocket = (_io: Server, socket: Socket) => {
  notificationIo = _io;

  // User subscribe notifications cá nhân
  socket.on('subscribe_notifications', (userId: number) => {
    socket.join(`notify_${userId}`);
  });

  // User join room của bài post đang xem (nhận comment realtime)
  socket.on('join_post', (postId: number) => {
    if (!Number.isFinite(postId) || postId <= 0) return;
    socket.join(`post_${postId}`);
  });

  // User rời trang post → leave room
  socket.on('leave_post', (postId: number) => {
    socket.leave(`post_${postId}`);
  });
};

// Gửi notification đến 1 user cụ thể
export const emitNotificationToUser = (userId: number, notification: NotificationItemDto) => {
  if (!notificationIo || !Number.isFinite(userId) || userId <= 0) return;
  notificationIo.to(`notify_${userId}`).emit('new_notification', notification);
};

// Broadcast comment mới đến TẤT CẢ người đang xem bài post đó
export const emitNewCommentToPost = (postId: number, comment: CommentItemDTO) => {
  if (!notificationIo || !Number.isFinite(postId) || postId <= 0) return;
  notificationIo.to(`post_${postId}`).emit('new_comment', comment);
};