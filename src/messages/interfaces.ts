export interface IUser {
  id: string;
  name: string;
  avatarUrl?: string;
  onlineStatus: boolean;
}

export interface IMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
}

export interface IConversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  unreadCount: Record<string, number>;
}
