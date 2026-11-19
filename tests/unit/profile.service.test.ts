import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileService } from "@/lib/services/profile.service";
import type { ProfileRepository } from "@/lib/repositories/ports";
import type { FriendProfile, Profile } from "@/lib/domain/types";
import { ValidationError } from "@/lib/domain/errors";

describe("ProfileService", () => {
  const currentUserId = "user-1111-2222-3333";
  let mockProfileRepo: ProfileRepository;

  beforeEach(() => {
    mockProfileRepo = {
      getById: vi.fn(),
      update: vi.fn(),
      search: vi.fn(),
      checkUsernameAvailability: vi.fn(),
      getCallPeer: vi.fn(),
      getChatProfiles: vi.fn(),
      upsertProfile: vi.fn(),
      updateLastSeen: vi.fn(),
    } as unknown as ProfileRepository;
  });

  it("fetches the current authenticated user profile via getMe", async () => {
    const mockProfile: Profile = {
      id: currentUserId,
      username: "bindu_dev",
      display_name: "Bindu Penumala",
      avatar_url: "https://example.com/avatar.png",
      about: "Full stack developer",
      status_message: "Coding",
      phone_number: "+123456789",
      last_seen: "2026-11-19T10:00:00Z",
    };
    vi.mocked(mockProfileRepo.getById).mockResolvedValueOnce(mockProfile);

    const service = new ProfileService(currentUserId, mockProfileRepo);
    const result = await service.getMe();

    expect(result).toEqual(mockProfile);
    expect(mockProfileRepo.getById).toHaveBeenCalledWith(currentUserId);
  });

  it("returns null when current user profile is not found", async () => {
    vi.mocked(mockProfileRepo.getById).mockResolvedValueOnce(null);

    const service = new ProfileService(currentUserId, mockProfileRepo);
    const result = await service.getMe();

    expect(result).toBeNull();
  });

  it("updates current user profile with patch fields", async () => {
    const patch = { display_name: "Bindu P.", status_message: "Available" };
    const updatedProfile: Profile = {
      id: currentUserId,
      username: "bindu_dev",
      display_name: "Bindu P.",
      avatar_url: null,
      about: null,
      status_message: "Available",
      phone_number: null,
      last_seen: null,
    };
    vi.mocked(mockProfileRepo.update).mockResolvedValueOnce(updatedProfile);

    const service = new ProfileService(currentUserId, mockProfileRepo);
    const result = await service.updateMe(patch);

    expect(result).toEqual(updatedProfile);
    expect(mockProfileRepo.update).toHaveBeenCalledWith(currentUserId, patch);
  });

  it("searches users with query excluding self", async () => {
    const expectedUsers: FriendProfile[] = [
      {
        id: "other-user-4444",
        username: "alice",
        display_name: "Alice Engineer",
        avatar_url: null,
      },
    ];
    vi.mocked(mockProfileRepo.search).mockResolvedValueOnce(expectedUsers);

    const service = new ProfileService(currentUserId, mockProfileRepo);
    const results = await service.searchUsers("alice");

    expect(results).toEqual(expectedUsers);
    expect(mockProfileRepo.search).toHaveBeenCalledWith("alice", currentUserId);
  });

  it("throws ValidationError when search query is empty or whitespace", async () => {
    const service = new ProfileService(currentUserId, mockProfileRepo);

    await expect(service.searchUsers("")).rejects.toThrow(ValidationError);
    await expect(service.searchUsers("   ")).rejects.toThrow("Query is required");
    expect(mockProfileRepo.search).not.toHaveBeenCalled();
  });

  it("checks username availability via repository", async () => {
    vi.mocked(mockProfileRepo.checkUsernameAvailability).mockResolvedValueOnce(true);

    const service = new ProfileService(currentUserId, mockProfileRepo);
    const isAvailable = await service.checkUsernameAvailability("bindu_innovator");

    expect(isAvailable).toBe(true);
    expect(mockProfileRepo.checkUsernameAvailability).toHaveBeenCalledWith("bindu_innovator");
  });
});
