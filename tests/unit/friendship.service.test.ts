import { describe, it, expect, vi, beforeEach } from "vitest";
import { FriendshipService } from "@/lib/services/friendship.service";
import type { FriendshipRepository, ProfileRepository } from "@/lib/repositories/ports";
import type { Friendship, ChatProfile } from "@/lib/domain/types";
import { ValidationError } from "@/lib/domain/errors";

describe("FriendshipService", () => {
  const currentUserId = "user-1111-1111-1111";
  const friendUserId = "user-2222-2222-2222";
  const friendshipId = "friendship-9999-9999";

  let mockFriendshipRepo: FriendshipRepository;
  let mockProfileRepo: ProfileRepository;

  beforeEach(() => {
    mockFriendshipRepo = {
      listForUser: vi.fn(),
      findByPair: vi.fn(),
      insert: vi.fn(),
      updateStatus: vi.fn(),
      deleteAsAddressee: vi.fn(),
      deleteForParticipant: vi.fn(),
    } as unknown as FriendshipRepository;

    mockProfileRepo = {
      getChatProfiles: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      search: vi.fn(),
      checkUsernameAvailability: vi.fn(),
      getCallPeer: vi.fn(),
      upsertProfile: vi.fn(),
      updateLastSeen: vi.fn(),
    } as unknown as ProfileRepository;
  });

  describe("list", () => {
    it("returns empty friendships and empty profiles map when user has no friends", async () => {
      vi.mocked(mockFriendshipRepo.listForUser).mockResolvedValueOnce([]);

      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.list();

      expect(result).toEqual({ friendships: [], profiles: {} });
      expect(mockProfileRepo.getChatProfiles).not.toHaveBeenCalled();
    });

    it("populates profiles map for friends where current user is requester or addressee", async () => {
      const friendships: Friendship[] = [
        {
          id: "f1",
          requester_id: currentUserId,
          addressee_id: friendUserId,
          status: "accepted",
          created_at: "2026-11-19T00:00:00Z",
          updated_at: "2026-11-19T00:00:00Z",
        },
      ];
      const profiles: ChatProfile[] = [
        {
          id: friendUserId,
          username: "bob",
          display_name: "Bob Builder",
          avatar_url: "https://example.com/bob.jpg",
          last_seen: null,
        },
      ];

      vi.mocked(mockFriendshipRepo.listForUser).mockResolvedValueOnce(friendships);
      vi.mocked(mockProfileRepo.getChatProfiles).mockResolvedValueOnce(profiles);

      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.list();

      expect(result.friendships).toHaveLength(1);
      expect(result.profiles[friendUserId]).toEqual({
        id: friendUserId,
        username: "bob",
        display_name: "Bob Builder",
        avatar_url: "https://example.com/bob.jpg",
      });
      expect(mockProfileRepo.getChatProfiles).toHaveBeenCalledWith([friendUserId]);
    });
  });

  describe("sendRequest", () => {
    it("throws ValidationError when attempting to friend self", async () => {
      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);

      await expect(service.sendRequest(currentUserId)).rejects.toThrow(ValidationError);
      await expect(service.sendRequest(currentUserId)).rejects.toThrow("You can't friend yourself");
      expect(mockFriendshipRepo.insert).not.toHaveBeenCalled();
    });

    it("creates a pending request when no reverse relationship exists", async () => {
      const pending: Friendship = {
        id: friendshipId,
        requester_id: currentUserId,
        addressee_id: friendUserId,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      vi.mocked(mockFriendshipRepo.findByPair).mockResolvedValueOnce(null);
      vi.mocked(mockFriendshipRepo.insert).mockResolvedValueOnce(pending);

      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.sendRequest(friendUserId);

      expect(result).toEqual(pending);
      expect(mockFriendshipRepo.insert).toHaveBeenCalledWith({
        requester_id: currentUserId,
        addressee_id: friendUserId,
        status: "pending",
      });
    });

    it("auto-accepts request if reverse pending request already exists", async () => {
      const existingReverse: Friendship = {
        id: friendshipId,
        requester_id: friendUserId,
        addressee_id: currentUserId,
        status: "pending",
        created_at: "2026-11-18T00:00:00Z",
        updated_at: "2026-11-18T00:00:00Z",
      };
      const accepted: Friendship = {
        ...existingReverse,
        status: "accepted",
      };
      vi.mocked(mockFriendshipRepo.findByPair).mockResolvedValueOnce(existingReverse);
      vi.mocked(mockFriendshipRepo.updateStatus).mockResolvedValueOnce(accepted);

      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.sendRequest(friendUserId);

      expect(result.status).toBe("accepted");
      expect(mockFriendshipRepo.updateStatus).toHaveBeenCalledWith(
        friendshipId,
        "accepted",
        expect.any(String),
      );
      expect(mockFriendshipRepo.insert).not.toHaveBeenCalled();
    });

    it("is idempotent if reverse friendship is already accepted", async () => {
      const existingAccepted: Friendship = {
        id: friendshipId,
        requester_id: friendUserId,
        addressee_id: currentUserId,
        status: "accepted",
        created_at: "2026-11-18T00:00:00Z",
        updated_at: "2026-11-18T00:00:00Z",
      };
      vi.mocked(mockFriendshipRepo.findByPair).mockResolvedValueOnce(existingAccepted);

      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.sendRequest(friendUserId);

      expect(result).toEqual(existingAccepted);
      expect(mockFriendshipRepo.updateStatus).not.toHaveBeenCalled();
      expect(mockFriendshipRepo.insert).not.toHaveBeenCalled();
    });
  });

  describe("respond", () => {
    it("accepts incoming friend request", async () => {
      const accepted: Friendship = {
        id: friendshipId,
        requester_id: friendUserId,
        addressee_id: currentUserId,
        status: "accepted",
        created_at: "2026-11-18T00:00:00Z",
        updated_at: "2026-11-19T00:00:00Z",
      };
      vi.mocked(mockFriendshipRepo.updateStatus).mockResolvedValueOnce(accepted);

      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.respond(friendshipId, "accept");

      expect(result).toEqual(accepted);
      expect(mockFriendshipRepo.updateStatus).toHaveBeenCalledWith(
        friendshipId,
        "accepted",
        expect.any(String),
      );
    });

    it("blocks friendship upon block action", async () => {
      const blocked: Friendship = {
        id: friendshipId,
        requester_id: friendUserId,
        addressee_id: currentUserId,
        status: "blocked",
        created_at: "2026-11-18T00:00:00Z",
        updated_at: "2026-11-19T00:00:00Z",
      };
      vi.mocked(mockFriendshipRepo.updateStatus).mockResolvedValueOnce(blocked);

      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.respond(friendshipId, "block");

      expect(result).toEqual(blocked);
      expect(mockFriendshipRepo.updateStatus).toHaveBeenCalledWith(
        friendshipId,
        "blocked",
        expect.any(String),
      );
    });

    it("deletes friend request as addressee upon decline action", async () => {
      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.respond(friendshipId, "decline");

      expect(result).toEqual({ ok: true });
      expect(mockFriendshipRepo.deleteAsAddressee).toHaveBeenCalledWith(friendshipId, currentUserId);
      expect(mockFriendshipRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("deletes existing friendship for participant", async () => {
      const service = new FriendshipService(currentUserId, mockFriendshipRepo, mockProfileRepo);
      const result = await service.remove(friendshipId);

      expect(result).toEqual({ ok: true });
      expect(mockFriendshipRepo.deleteForParticipant).toHaveBeenCalledWith(friendshipId, currentUserId);
    });
  });
});
