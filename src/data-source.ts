import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dbConfig } from './core/config/database.js';
import {
  User,
  Post,
  PostMedia,
  PostHashtag,
  Hashtag,
  Comment,
  PostLike,
  Report,
  Follow,
  FollowRequest,
  Message,
  Conversation,
  ConversationMember,
  Notification,
  Story,
  StoryView,
  UserInteraction,
  UserBlock,
} from './database/entity/index.js';


export const AppDataSource = new DataSource({
  ...dbConfig,

entities: [
  User,
  Post,
  PostMedia,
  PostHashtag,
  Hashtag,
  Comment,
  PostLike,
  Report,
  Follow,
  FollowRequest,
  Message,
  Conversation,
  ConversationMember,
  Notification,
  Story,
  StoryView,
  UserInteraction,
  UserBlock,
],


  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  logging: true,
});
