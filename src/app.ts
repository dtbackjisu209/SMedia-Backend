import "reflect-metadata";
import express from 'express';
import cors from 'cors'; 
import { errorMiddleware } from './middlewares/error.middleware.js';
import postRouter from './routes/post.route.js';

const app = express();

app.use(cors()); 
app.use(express.json());
app.use('/api/v1/posts', postRouter);
app.use(errorMiddleware);

export default app;