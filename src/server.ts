import "reflect-metadata";
import app from './app.js'; 
import http from "http";
import { AppDataSource } from "./data-source.js";
import { Server, Socket } from "socket.io"; 
import { chatSocket } from "./socket/chat.socket.js";
import { notificationSocket } from "./socket/notification.socket.js";
const PORT = 3000;

// 1. Khởi tạo Database trước
AppDataSource.initialize()
    .then(() => {
        console.log("Database has been initialized!");

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