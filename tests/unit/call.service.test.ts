import { describe, it, expect, vi, beforeEach } from "vitest";
import { CallService } from "@/lib/services/call.service";
import type { CallRepository, ProfileRepository } from "@/lib/repositories/ports";
import type { Call, ChatProfile } from "@/lib/domain/types";

describe("CallService", () => {
  const callerId = "11111111-1111-1111-1111-111111111111";
  const calleeId = "22222222-2222-2222-2222-222222222222";
  const convId = "33333333-3333-3333-3333-333333333333";
  const callId = "44444444-4444-4444-4444-444444444444";

  let mockCallRepo: CallRepository;
  let mockProfileRepo: ProfileRepository;

  beforeEach(() => {
    mockCallRepo = {
      insert: vi.fn(),
      getById: vi.fn(),
      updateStatus: vi.fn(),
      listForUser: vi.fn(),
      deleteFromHistory: vi.fn(),
    };
    mockProfileRepo = {
      getById: vi.fn(),
      getCallPeer: vi.fn(),
      getChatProfiles: vi.fn(),
      upsertProfile: vi.fn(),
      updateLastSeen: vi.fn(),
    } as unknown as ProfileRepository;
  });

  it("creates a call record with status ringing", async () => {
    const mockCall: Call = {
      id: callId,
      conversation_id: convId,
      caller_id: callerId,
      callee_id: calleeId,
      call_type: "voice",
      status: "ringing",
      created_at: new Date().toISOString(),
      started_at: null,
      ended_at: null,
      duration_seconds: null,
    };
    vi.mocked(mockCallRepo.insert).mockResolvedValueOnce(mockCall);

    const service = new CallService(callerId, mockCallRepo, mockProfileRepo);
    const result = await service.create({
      conversation_id: convId,
      callee_id: calleeId,
      call_type: "voice",
    });

    expect(result.id).toBe(callId);
    expect(result.status).toBe("ringing");
    expect(mockCallRepo.insert).toHaveBeenCalledWith({
      conversation_id: convId,
      caller_id: callerId,
      callee_id: calleeId,
      call_type: "voice",
      status: "ringing",
    });
  });

  it("updates status to accepted and records started_at", async () => {
    const service = new CallService(callerId, mockCallRepo, mockProfileRepo);
    const res = await service.updateStatus(callId, "accepted");

    expect(res.ok).toBe(true);
    expect(mockCallRepo.updateStatus).toHaveBeenCalledWith(
      callId,
      expect.objectContaining({
        status: "accepted",
        started_at: expect.any(String),
      }),
    );
  });

  it("updates status to ended and passes duration_seconds", async () => {
    const service = new CallService(callerId, mockCallRepo, mockProfileRepo);
    const res = await service.updateStatus(callId, "ended", 125);

    expect(res.ok).toBe(true);
    expect(mockCallRepo.updateStatus).toHaveBeenCalledWith(
      callId,
      expect.objectContaining({
        status: "ended",
        ended_at: expect.any(String),
        duration_seconds: 125,
      }),
    );
  });

  it("lists call history with correct direction and peer information", async () => {
    const mockCalls: Call[] = [
      {
        id: "c1",
        conversation_id: convId,
        caller_id: callerId,
        callee_id: calleeId,
        call_type: "voice",
        status: "ended",
        created_at: "2026-09-10T10:00:00Z",
        started_at: "2026-09-10T10:00:05Z",
        ended_at: "2026-09-10T10:02:05Z",
      },
      {
        id: "c2",
        conversation_id: convId,
        caller_id: calleeId,
        callee_id: callerId,
        call_type: "video",
        status: "missed",
        created_at: "2026-09-11T12:00:00Z",
        started_at: null,
        ended_at: "2026-09-11T12:00:30Z",
      },
    ];

    const mockProfiles: ChatProfile[] = [
      {
        id: calleeId,
        username: "bob",
        display_name: "Bob Builder",
        avatar_url: "https://example.com/avatar.jpg",
        last_seen: null,
      },
    ];

    vi.mocked(mockCallRepo.listForUser).mockResolvedValueOnce(mockCalls);
    vi.mocked(mockProfileRepo.getChatProfiles).mockResolvedValueOnce(mockProfiles);

    const service = new CallService(callerId, mockCallRepo, mockProfileRepo);
    const history = await service.listHistory();

    expect(history).toHaveLength(2);
    // First call was outgoing
    expect(history[0].id).toBe("c1");
    expect(history[0].direction).toBe("outgoing");
    expect(history[0].peer?.display_name).toBe("Bob Builder");
    expect(history[0].duration_seconds).toBe(120);

    // Second call was incoming
    expect(history[1].id).toBe("c2");
    expect(history[1].direction).toBe("incoming");
    expect(history[1].peer?.display_name).toBe("Bob Builder");
    expect(history[1].status).toBe("missed");
  });

  it("deletes a call from user's history", async () => {
    const service = new CallService(callerId, mockCallRepo, mockProfileRepo);
    const res = await service.deleteFromHistory(callId);

    expect(res.ok).toBe(true);
    expect(mockCallRepo.deleteFromHistory).toHaveBeenCalledWith(callId, callerId);
  });
});
