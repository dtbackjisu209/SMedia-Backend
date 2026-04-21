import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dbConfig } from './core/config/database.js';
import { Init1769599359919 } from './database/migrations/1769599359919-init.js';
import { AddFollowRequests1773000000000 } from './database/migrations/1773000000000-add-follow-requests.js';
import { AddLikeCommentCountToPost1774189442333 } from './database/migrations/1774189442333-add-like-comment-count-to-post.js';
import { AddConversationName1775000000000 } from './database/migrations/1775000000000-add-conversation-name.js';
import { ExpandNotifications1775200000000 } from './database/migrations/1775200000000-expand-notifications.js';
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
    UserBlock,
  ],
  migrations: [
    Init1769599359919,
    AddFollowRequests1773000000000,
    AddLikeCommentCountToPost1774189442333,
    AddConversationName1775000000000,
    ExpandNotifications1775200000000,
  ],
  migrationsRun: true,
});