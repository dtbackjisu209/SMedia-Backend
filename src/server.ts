import "reflect-metadata";
import app from './app.js'; 
import http from "http";
import express from 'express';
import authRoutes from './modules/auth/auth.route.js';
import { AppDataSource } from "./data-source.js";
import { Server, Socket } from "socket.io"; 
import { chatSocket } from './modules/conversation/conversation.socket.js';
import { notificationSocket } from './modules/notification/notification.socket.js';
import {
    ensureFanoutRedisConnected,
    ensureQueueRedisConnected,
    fanoutRedisClient,
    queueRedisClient,
} from './core/config/redis.js';
import { checkCloudinaryConnection } from './core/config/cloudinary.js';
import { startPostDeleteCleanupWorker } from './modules/post/queues/post-delete/post-delete.worker.js';
import { startPostFeedFanoutWorker } from './modules/post/queues/post-fanout/post-fanout.worker.js';
import storyRouter from './modules/story/story.route.js';
import { startUserInteractionWorker } from './modules/post/queues/user-interaction/user-interaction.worker.js';
const PORT = 3000;
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRouter);

// 1. Khởi tạo Database trước
AppDataSource.initialize()
    .then(() => {
        console.log("Database has been initialized!");

        checkCloudinaryConnection()
            .then(() => console.log('Cloudinary connected'))
            .catch((error) => console.error('Cloudinary connection failed:', error));

        Promise.all([ensureFanoutRedisConnected(), ensureQueueRedisConnected()])
            .then(async () => {
                const [fanoutPong, queuePong] = await Promise.all([
                    fanoutRedisClient.ping(),
                    queueRedisClient.ping(),
                ]);
                console.log(`Redis fanout connected (${fanoutPong})`);
                console.log(`Redis queue connected (${queuePong})`);
                startPostFeedFanoutWorker();
                console.log('Post feed fanout worker started');
                startUserInteractionWorker();
                console.log('User interaction worker started');
                startPostDeleteCleanupWorker();
                console.log('Post delete cleanup worker started');
            })
            .catch((error) => console.error('Redis connection failed:', error));

        // 2. Tạo HTTP Server từ Express App
        // Socket.io cần một HTTP Server thuần để đính kèm vào
        const server = http.createServer(app);

        // 3. Khởi tạo Socket.io trên HTTP Server đó
        const io = new Server(server, {
            cors: {
                origin: "*", // Trong thực tế nên thay bằng domain của VueJS (vd: http://localhost:5173)
                methods: ["GET", "POST"]
            }
        });

        // 4. Lắng nghe các kết nối Socket
        io.on("connection", (socket) => {
            console.log(`User connected: ${socket.id}`);

            // Truyền io và socket vào các module xử lý riêng
            chatSocket(io, socket);
            notificationSocket(io, socket);

            socket.on("disconnect", () => {
                console.log(`User disconnected: ${socket.id}`);
            });
        });

        // 5. Quan trọng: Dùng server.listen thay vì app.listen
        server.listen(PORT, () => {
            console.log(`Server and Realtime Socket are running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Error during Data Source initialization:", error);
    });