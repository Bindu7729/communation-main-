import { describe, it, expect, vi, beforeEach } from "vitest";
import { StarService } from "@/lib/services/star.service";
import type {
  ConversationRepository,
  MessageRepository,
  ProfileRepository,
  StarRepository,
} from "@/lib/repositories/ports";
import type { IConversationPolicy, IMessagePolicy } from "@/lib/auth/authorization";
import type { ChatProfile, ConversationMember, Message } from "@/lib/domain/types";

describe("StarService Details & Policies", () => {
  const currentUserId = "user-alice";
  const otherUserId = "user-bob";
  const convId = "conv-direct-100";
  const msgId1 = "msg-101";
  const msgId2 = "msg-102";

  let mockStarsRepo: StarRepository;
  let mockMessagesRepo: MessageRepository;
  let mockConversationsRepo: ConversationRepository;
  let mockProfilesRepo: ProfileRepository;
  let mockMessagePolicy: IMessagePolicy;
  let mockConversationPolicy: IConversationPolicy;

  beforeEach(() => {
    mockStarsRepo = {
      findMine: vi.fn(),
      insert: vi.fn(),
      deleteMine: vi.fn(),
      listMine: vi.fn().mockResolvedValue([]),
      listMineIn: vi.fn().mockResolvedValue([]),
    };

    mockMessagesRepo = {
      getByIds: vi.fn().mockResolvedValue([]),
      listIds: vi.fn().mockResolvedValue([]),
    } as unknown as MessageRepository;

    mockConversationsRepo = {
      listMembers: vi.fn().mockResolvedValue([]),
    } as unknown as ConversationRepository;

    mockProfilesRepo = {
      getChatProfiles: vi.fn().mockResolvedValue([]),
    } as unknown as ProfileRepository;

    mockMessagePolicy = {
      requireAccess: vi.fn().mockResolvedValue({} as Message),
    } as unknown as IMessagePolicy;

    mockConversationPolicy = {
      requireMembership: vi.fn().mockResolvedValue(undefined),
    } as unknown as IConversationPolicy;
  });

  describe("listMine", () => {
    it("returns empty array if user has no starred messages", async () => {
      const service = new StarService(
        currentUserId,
        mockStarsRepo,
        mockMessagesRepo,
        mockConversationsRepo,
        mockProfilesRepo,
      );

      const result = await service.listMine();
      expect(result).toEqual([]);
      expect(mockMessagesRepo.getByIds).not.toHaveBeenCalled();
    });

    it("correlates starred messages with peer chat profiles in preserved star order", async () => {
      vi.mocked(mockStarsRepo.listMine).mockResolvedValueOnce([
        { message_id: msgId2, starred_at: "2026-11-19T10:05:00Z" },
        { message_id: msgId1, starred_at: "2026-11-19T10:00:00Z" },
      ]);

      const messages: Message[] = [
        {
          id: msgId1,
          conversation_id: convId,
          sender_id: otherUserId,
          body: "First message",
          client_id: null,
          created_at: "2026-11-19T09:00:00Z",
          edited_at: null,
          deleted_at: null,
          reply_to_id: null,
          forwarded_from_id: null,
        },
        {
          id: msgId2,
          conversation_id: convId,
          sender_id: otherUserId,
          body: "Second message",
          client_id: null,
          created_at: "2026-11-19T09:05:00Z",
          edited_at: null,
          deleted_at: null,
          reply_to_id: null,
          forwarded_from_id: null,
        },
      ];
      vi.mocked(mockMessagesRepo.getByIds).mockResolvedValueOnce(messages);

      const members: ConversationMember[] = [
        { conversation_id: convId, user_id: currentUserId, role: "member" },
        { conversation_id: convId, user_id: otherUserId, role: "member" },
      ];
      vi.mocked(mockConversationsRepo.listMembers).mockResolvedValueOnce(members);

      const profiles: ChatProfile[] = [
        {
          id: otherUserId,
          username: "bob",
          display_name: "Bob Builder",
          avatar_url: "https://example.com/bob.jpg",
          last_seen: null,
        },
      ];
      vi.mocked(mockProfilesRepo.getChatProfiles).mockResolvedValueOnce(profiles);

      const service = new StarService(
        currentUserId,
        mockStarsRepo,
        mockMessagesRepo,
        mockConversationsRepo,
        mockProfilesRepo,
      );

      const list = await service.listMine();

      expect(list).toHaveLength(2);
      // Preserves star order (msgId2 first, then msgId1)
      expect(list[0].message.id).toBe(msgId2);
      expect(list[0].other?.display_name).toBe("Bob Builder");
      expect(list[1].message.id).toBe(msgId1);
      expect(list[1].other?.display_name).toBe("Bob Builder");
    });
  });

  describe("listIdsInConversation", () => {
    it("enforces conversation membership policy and returns starred IDs", async () => {
      vi.mocked(mockMessagesRepo.listIds).mockResolvedValueOnce([msgId1, msgId2]);
      vi.mocked(mockStarsRepo.listMineIn).mockResolvedValueOnce([msgId1]);

      const service = new StarService(
        currentUserId,
        mockStarsRepo,
        mockMessagesRepo,
        mockConversationsRepo,
        mockProfilesRepo,
        undefined,
        mockConversationPolicy,
      );

      const ids = await service.listIdsInConversation(convId);

      expect(ids).toEqual([msgId1]);
      expect(mockConversationPolicy.requireMembership).toHaveBeenCalledWith(currentUserId, convId);
      expect(mockMessagesRepo.listIds).toHaveBeenCalledWith(convId, { limit: 500 });
      expect(mockStarsRepo.listMineIn).toHaveBeenCalledWith(currentUserId, [msgId1, msgId2]);
    });
  });

  describe("toggle policy enforcement", () => {
    it("enforces messagePolicy requireAccess before checking or modifying star status", async () => {
      vi.mocked(mockStarsRepo.findMine).mockResolvedValueOnce(null);

      const service = new StarService(
        currentUserId,
        mockStarsRepo,
        mockMessagesRepo,
        mockConversationsRepo,
        mockProfilesRepo,
        mockMessagePolicy,
      );

      const res = await service.toggle(msgId1);
      expect(res).toEqual({ starred: true });
      expect(mockMessagePolicy.requireAccess).toHaveBeenCalledWith(currentUserId, msgId1);
      expect(mockStarsRepo.insert).toHaveBeenCalledWith(currentUserId, msgId1);
    });
  });
});
