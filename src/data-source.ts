import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dbConfig } from './config/database.js';
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
  Message,
  Conversation,
  ConversationMember,
  Notification,
  Story,
  StoryView,
  UserBlock,
} from './models/index.js';


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
  Message,
  Conversation,
  ConversationMember,
  Notification,
  Story,
  StoryView,
  UserBlock,
],


  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: true,
});
