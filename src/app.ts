import "reflect-metadata";
import express from 'express';
import cors from 'cors';
import { errorHandler } from './core/handler/error-handle.js';
import postRouter from './modules/post/post.route.js';
import postLikeRouter from './modules/postLike/postLike.route.js';
import authRouter from './modules/auth/auth.route.js';
import commentRouter from './modules/comment/comment.route.js';

import conversationRouter from './modules/conversation/conversation.route.js';
import conversationMemberRouter from './modules/conversationMember/conversationMember.route.js';
import followRouter from './modules/follow/follow.route.js';
import notificationRouter from './modules/notification/notification.route.js';
import profileRouter from './modules/profile/profile.route.js';
import userRouter from './modules/user/user.route.js';

import storyRouter from './modules/story/story.route.js';


const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/posts', postRouter);
app.use('/api/v1/post-likes', postLikeRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/auth', authRouter);

app.use('/api/v1', followRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/conversations', conversationRouter);
app.use('/api/v1/conversations', conversationMemberRouter);


app.use('/api/v1/stories', storyRouter);

app.use(errorHandler);

export default app;
