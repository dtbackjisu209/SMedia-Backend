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
import { closeNeo4j, ensureNeo4jConnected } from './core/config/neo4j.js';
import { startPostDeleteCleanupWorker } from './modules/post/queues/post-delete/post-delete.worker.js';
import { startPostCacheRefreshWorker } from './modules/post/queues/post-cache-refresh/post-cache-refresh.worker.js';
import { startPostFeedFanoutWorker } from './modules/post/queues/post-fanout/post-fanout.worker.js';
import storyRouter from './modules/story/story.route.js';
import { startUserInteractionWorker } from './modules/post/queues/user-interaction/user-interaction.worker.js';
import { startUnfollowFeedCleanupWorker } from './modules/follow/queues/unfollow-feed-cleanup/unfollow-feed-cleanup.worker.js';
import { startAiModerationWorker } from './modules/post/queues/ai-moderation/ai-moderation.worker.js';
import { startStoryModerationWorker } from './modules/story/queues/story-moderation/story-moderation.worker.js';
import graphService from './modules/graph/graph.service.js';
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

        ensureNeo4jConnected()
            .then(async (driver) => {
                if (driver) {
                    await graphService.initializeSchema();
                    console.log('Neo4j connected');
                } else {
                    console.log('Neo4j disabled');
                }
            })
            .catch((error) => console.error('Neo4j connection failed:', error));

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
                startPostCacheRefreshWorker();
                console.log('Post cache refresh worker started');
                startUnfollowFeedCleanupWorker();
                console.log('Unfollow feed cleanup worker started');
                startAiModerationWorker();
                console.log('AI moderation worker started');
                startStoryModerationWorker();
                console.log('Story moderation worker started');
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
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server and Realtime Socket are running on port ${PORT}`);
    });

        const shutdown = async (signal: string) => {
            console.log(`${signal} received. Closing services...`);
            await closeNeo4j().catch((error) => console.error('Neo4j close failed:', error));
            server.close(() => {
                process.exit(0);
            });
        };

        process.once('SIGINT', () => void shutdown('SIGINT'));
        process.once('SIGTERM', () => void shutdown('SIGTERM'));
    })
    .catch((error) => {
        console.error("Error during Data Source initialization:", error);
    });
    
