import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReactionService } from "@/lib/services/reaction.service";
import type { ReactionRepository, MessageRepository } from "@/lib/repositories/ports";
import type { IConversationPolicy, IMessagePolicy } from "@/lib/auth/authorization";
import type { Message, Reaction } from "@/lib/domain/types";

describe("ReactionService Policies & Operations", () => {
  const currentUserId = "user-alice";
  const convId = "conv-room-101";
  const messageId = "msg-chat-404";

  let mockReactionsRepo: ReactionRepository;
  let mockMessagesRepo: MessageRepository;
  let mockMessagePolicy: IMessagePolicy;
  let mockConversationPolicy: IConversationPolicy;

  beforeEach(() => {
    mockReactionsRepo = {
      findMine: vi.fn(),
      insert: vi.fn(),
      deleteMine: vi.fn(),
      listForMessageIds: vi.fn().mockResolvedValue([]),
    };

    mockMessagesRepo = {
      listIds: vi.fn().mockResolvedValue([]),
      getByIds: vi.fn().mockResolvedValue([]),
    } as unknown as MessageRepository;

    mockMessagePolicy = {
      requireAccess: vi.fn().mockResolvedValue({} as Message),
    } as unknown as IMessagePolicy;

    mockConversationPolicy = {
      requireMembership: vi.fn().mockResolvedValue(undefined),
    } as unknown as IConversationPolicy;
  });

  describe("toggle policy enforcement", () => {
    it("enforces messagePolicy access verification before toggling reaction", async () => {
      vi.mocked(mockReactionsRepo.findMine).mockResolvedValueOnce(null);

      const service = new ReactionService(
        currentUserId,
        mockReactionsRepo,
        mockMessagesRepo,
        mockMessagePolicy,
      );

      const res = await service.toggle(messageId, "🔥");
      expect(res).toEqual({ added: true });
      expect(mockMessagePolicy.requireAccess).toHaveBeenCalledWith(currentUserId, messageId);
      expect(mockReactionsRepo.insert).toHaveBeenCalledWith({
        message_id: messageId,
        user_id: currentUserId,
        emoji: "🔥",
      });
    });

    it("removes existing reaction when toggled again", async () => {
      const existing: Reaction = {
        message_id: messageId,
        user_id: currentUserId,
        emoji: "🎉",
      };
      vi.mocked(mockReactionsRepo.findMine).mockResolvedValueOnce(existing);

      const service = new ReactionService(
        currentUserId,
        mockReactionsRepo,
        mockMessagesRepo,
        mockMessagePolicy,
      );

      const res = await service.toggle(messageId, "🎉");
      expect(res).toEqual({ added: false });
      expect(mockReactionsRepo.deleteMine).toHaveBeenCalledWith(currentUserId, messageId, "🎉");
    });
  });

  describe("listForConversation", () => {
    it("enforces conversation membership policy and lists reactions by message IDs", async () => {
      const msgIds = ["msg-1", "msg-2"];
      const reactions: Reaction[] = [
        { message_id: "msg-1", user_id: currentUserId, emoji: "❤️" },
      ];
      vi.mocked(mockMessagesRepo.listIds).mockResolvedValueOnce(msgIds);
      vi.mocked(mockReactionsRepo.listForMessageIds).mockResolvedValueOnce(reactions);

      const service = new ReactionService(
        currentUserId,
        mockReactionsRepo,
        mockMessagesRepo,
        undefined,
        mockConversationPolicy,
      );

      const result = await service.listForConversation(convId);
      expect(result).toEqual(reactions);
      expect(mockConversationPolicy.requireMembership).toHaveBeenCalledWith(currentUserId, convId);
      expect(mockMessagesRepo.listIds).toHaveBeenCalledWith(convId, { limit: 500 });
      expect(mockReactionsRepo.listForMessageIds).toHaveBeenCalledWith(msgIds);
    });
  });
});
