import "reflect-metadata";
import express from 'express';
import cors from 'cors';
import { errorHandler } from './core/handler/error-handle.js';
import postRouter from './modules/post/post.route.js';
import authRouter from './modules/auth/auth.route.js';
<<<<<<< Updated upstream
import conversationRouter from './modules/conversation/conversation.route.js';
import conversationMemberRouter from './modules/conversationMember/conversationMember.route.js';
import followRouter from './modules/follow/follow.route.js';
import userRouter from './modules/user/user.route.js';
=======
import storyRouter from './modules/story/story.route.js';

>>>>>>> Stashed changes

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/posts', postRouter);
app.use('/api/v1/auth', authRouter);
<<<<<<< Updated upstream
app.use('/api/v1', followRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/conversations', conversationMemberRouter);

=======
app.use('/api/v1/stories', storyRouter);
>>>>>>> Stashed changes
app.use(errorHandler);

export default app;
