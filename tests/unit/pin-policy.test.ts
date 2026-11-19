import { describe, it, expect, vi, beforeEach } from "vitest";
import { PinService } from "@/lib/services/pin.service";
import type { ConversationRepository, MessageRepository, PinRepository } from "@/lib/repositories/ports";
import type { IConversationPolicy, IMessagePolicy } from "@/lib/auth/authorization";
import { AuthorizationError } from "@/lib/domain/errors";
import type { Conversation, ConversationMember, Message } from "@/lib/domain/types";

describe("PinService Policies & Group Permissions", () => {
  const currentUserId = "user-alice";
  const convId = "conv-group-101";
  const messageId = "msg-alpha";

  let mockPinsRepo: PinRepository;
  let mockMessagesRepo: MessageRepository;
  let mockConversationsRepo: ConversationRepository;
  let mockConversationPolicy: IConversationPolicy;
  let mockMessagePolicy: IMessagePolicy;

  beforeEach(() => {
    mockPinsRepo = {
      list: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockMessagesRepo = {
      getByIds: vi.fn().mockResolvedValue([]),
      listIds: vi.fn().mockResolvedValue([]),
    } as unknown as MessageRepository;

    mockConversationsRepo = {
      getById: vi.fn().mockResolvedValue({
        id: convId,
        kind: "group",
        title: "Alpha Group",
        last_message_at: "",
      } as Conversation),
      listMembers: vi.fn().mockResolvedValue([
        {
          conversation_id: convId,
          user_id: currentUserId,
          role: "member",
        } as ConversationMember,
      ]),
      getGroupPermissions: vi.fn().mockResolvedValue(null),
      getMemberRestriction: vi.fn().mockResolvedValue(null),
    } as unknown as ConversationRepository;

    mockConversationPolicy = {
      requireMembership: vi.fn().mockResolvedValue(undefined),
    } as unknown as IConversationPolicy;

    mockMessagePolicy = {
      requireAccess: vi.fn().mockResolvedValue({
        id: messageId,
        conversation_id: convId,
        sender_id: currentUserId,
        body: "Hello",
      } as Message),
    } as unknown as IMessagePolicy;
  });

  it("checks conversation membership before listing pins", async () => {
    const service = new PinService(
      currentUserId,
      mockPinsRepo,
      mockMessagesRepo,
      mockConversationPolicy,
    );

    await service.list(convId);
    expect(mockConversationPolicy.requireMembership).toHaveBeenCalledWith(currentUserId, convId);
    expect(mockPinsRepo.list).toHaveBeenCalledWith(convId);
  });

  it("checks conversation membership before unpinning a message", async () => {
    const service = new PinService(
      currentUserId,
      mockPinsRepo,
      mockMessagesRepo,
      mockConversationPolicy,
    );

    await service.unpin(convId, messageId);
    expect(mockConversationPolicy.requireMembership).toHaveBeenCalledWith(currentUserId, convId);
    expect(mockPinsRepo.delete).toHaveBeenCalledWith(convId, messageId);
  });

  it("permits group owner or admin to pin messages", async () => {
    vi.mocked(mockConversationsRepo.listMembers).mockResolvedValueOnce([
      {
        conversation_id: convId,
        user_id: currentUserId,
        role: "admin",
      } as ConversationMember,
    ]);

    const service = new PinService(
      currentUserId,
      mockPinsRepo,
      mockMessagesRepo,
      mockConversationPolicy,
      mockMessagePolicy,
      mockConversationsRepo,
    );

    const res = await service.pin(convId, messageId);
    expect(res).toEqual({ ok: true });
    expect(mockPinsRepo.insert).toHaveBeenCalledWith({
      conversation_id: convId,
      message_id: messageId,
      pinned_by: currentUserId,
    });
  });

  it("rejects pin attempt if regular member lacks group permission", async () => {
    // Member restricted from pinning
    vi.mocked(mockConversationsRepo.getGroupPermissions).mockResolvedValueOnce({
      allow_member_pins: false,
    } as any);

    const service = new PinService(
      currentUserId,
      mockPinsRepo,
      mockMessagesRepo,
      mockConversationPolicy,
      mockMessagePolicy,
      mockConversationsRepo,
    );

    await expect(service.pin(convId, messageId)).rejects.toThrow(AuthorizationError);
    expect(mockPinsRepo.insert).not.toHaveBeenCalled();
  });

  it("throws error if message does not belong to the target conversation", async () => {
    vi.mocked(mockConversationsRepo.listMembers).mockResolvedValueOnce([
      {
        conversation_id: convId,
        user_id: currentUserId,
        role: "admin",
      } as ConversationMember,
    ]);

    vi.mocked(mockMessagePolicy.requireAccess).mockResolvedValueOnce({
      id: messageId,
      conversation_id: "other-conversation-999",
      sender_id: "other-user",
      body: "Another message",
    } as Message);

    const service = new PinService(
      currentUserId,
      mockPinsRepo,
      mockMessagesRepo,
      mockConversationPolicy,
      mockMessagePolicy,
      mockConversationsRepo,
    );

    await expect(service.pin(convId, messageId)).rejects.toThrow(
      "Message does not belong to this conversation",
    );
    expect(mockPinsRepo.insert).not.toHaveBeenCalled();
  });
});
