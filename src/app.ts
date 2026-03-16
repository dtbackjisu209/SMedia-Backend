import "reflect-metadata";
import express from 'express';
import cors from 'cors'; // Cài đặt: npm install cors

const app = express();

app.use(cors()); // Cho phép VueJS truy cập
app.use(express.json());

export default app;