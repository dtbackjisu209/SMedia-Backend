// DTO cho tạo cuộc hội thoại 1-1
export interface CreatePrivateChatDTO {
    targetUserId: number;
}

// DTO cho tạo nhóm
export interface CreateGroupChatDTO {
    name: string;
    memberIds: number[];
}

// DTO cho lấy lịch sử tin nhắn
export interface GetMessagesQueryDTO {
    limit?: number;
    page?: number;
}

// Response DTO cho tin nhắn
export interface MessageResponseDTO {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    created_at: Date;
}

// Response DTO cho conversation
export interface ConversationResponseDTO {
    id: number;
    name?: string;
    type: 'private' | 'group';
    members?: MemberResponseDTO[];
    lastMessage?: MessageResponseDTO;
}

// Response DTO cho member
export interface MemberResponseDTO {
    id: number;
    user_id: number;
    username?: string;
    name?: string;
    avatar?: string;
}