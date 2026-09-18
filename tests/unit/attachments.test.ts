import { describe, it, expect, vi, beforeEach } from "vitest";
import { AttachmentService, SUPPORTED_ATTACHMENT_TYPES } from "@/lib/attachments";
import { AuthorizationError, NotFoundError, ValidationError } from "@/lib/domain/errors";
import type { DbClient } from "@/lib/infra/postgres/client";

function createMockDb() {
  const queryFn = vi.fn();
  // Allow db`...` tagged template literal
  const mockDb = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    return queryFn(strings, ...values);
  }) as unknown as DbClient;
  return { mockDb, queryFn };
}

describe("AttachmentService & MIME Types", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const convId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MIME Types and Supported Formats", () => {
    it("supports images, audio, video, and documents", () => {
      expect(SUPPORTED_ATTACHMENT_TYPES.has("image/jpeg")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("image/png")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("image/webp")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("image/gif")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("audio/webm")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("audio/ogg")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("audio/mpeg")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("video/mp4")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("video/webm")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("application/pdf")).toBe(true);
      expect(SUPPORTED_ATTACHMENT_TYPES.has("application/zip")).toBe(true);
    });

    it("rejects unsupported MIME types", async () => {
      const { mockDb, queryFn } = createMockDb();
      queryFn.mockResolvedValueOnce([{ ok: true }]); // member check
      const service = new AttachmentService(mockDb, userId);

      await expect(
        service.start({
          conversation_id: convId,
          filename: "malware.exe",
          mime_type: "application/x-msdownload",
          file_size: 1024,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects mismatched extension and MIME type", async () => {
      const { mockDb, queryFn } = createMockDb();
      queryFn.mockResolvedValueOnce([{ ok: true }]);
      const service = new AttachmentService(mockDb, userId);

      await expect(
        service.start({
          conversation_id: convId,
          filename: "picture.png",
          mime_type: "application/pdf",
          file_size: 1024,
        }),
      ).rejects.toThrow("Filename extension does not match file type");
    });
  });

  describe("File Size Validation", () => {
    it("rejects 0-byte files", async () => {
      const { mockDb, queryFn } = createMockDb();
      queryFn.mockResolvedValueOnce([{ ok: true }]);
      const service = new AttachmentService(mockDb, userId);

      await expect(
        service.start({
          conversation_id: convId,
          filename: "empty.pdf",
          mime_type: "application/pdf",
          file_size: 0,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects files exceeding maximum limit", async () => {
      const { mockDb, queryFn } = createMockDb();
      queryFn.mockResolvedValueOnce([{ ok: true }]);
      const service = new AttachmentService(mockDb, userId);

      await expect(
        service.start({
          conversation_id: convId,
          filename: "huge.mp4",
          mime_type: "video/mp4",
          file_size: 50 * 1024 * 1024, // 50MB > 10MB default
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Membership & Access Enforcement", () => {
    it("throws AuthorizationError if user is not a conversation member on start", async () => {
      const { mockDb, queryFn } = createMockDb();
      queryFn.mockResolvedValueOnce([]); // not a member
      const service = new AttachmentService(mockDb, userId);

      await expect(
        service.start({
          conversation_id: convId,
          filename: "photo.jpg",
          mime_type: "image/jpeg",
          file_size: 5000,
        }),
      ).rejects.toThrow(AuthorizationError);
    });

    it("generates presigned upload URL and inserts pending record for valid member", async () => {
      const { mockDb, queryFn } = createMockDb();
      queryFn.mockResolvedValueOnce([{ ok: true }]); // member check
      const mockRecord = {
        id: "33333333-3333-3333-3333-333333333333",
        conversation_id: convId,
        uploader_id: userId,
        message_id: null,
        storage_key: "attachments/test.jpg",
        original_filename: "photo.jpg",
        mime_type: "image/jpeg",
        file_size: 5000,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      queryFn.mockResolvedValueOnce([mockRecord]); // insert record

      const service = new AttachmentService(mockDb, userId);
      const res = await service.start({
        conversation_id: convId,
        filename: "photo.jpg",
        mime_type: "image/jpeg",
        file_size: 5000,
      });

      expect(res.attachment.id).toBe(mockRecord.id);
      expect(res.upload_url).toContain("X-Amz-Signature");
      expect(res.upload_url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
      expect(res.expires_in).toBe(300);
    });

    it("access throws NotFoundError if attachment is not attached", async () => {
      const { mockDb, queryFn } = createMockDb();
      const mockRecord = {
        id: "33333333-3333-3333-3333-333333333333",
        conversation_id: convId,
        uploader_id: userId,
        message_id: null,
        storage_key: "attachments/test.jpg",
        original_filename: "photo.jpg",
        mime_type: "image/jpeg",
        file_size: 5000,
        status: "pending", // not attached
        created_at: new Date().toISOString(),
      };
      queryFn.mockResolvedValueOnce([mockRecord]); // get
      queryFn.mockResolvedValueOnce([{ ok: true }]); // member check

      const service = new AttachmentService(mockDb, userId);
      await expect(service.access(mockRecord.id)).rejects.toThrow(NotFoundError);
    });

    it("access returns presigned GET URL for attached file", async () => {
      const { mockDb, queryFn } = createMockDb();
      const mockRecord = {
        id: "33333333-3333-3333-3333-333333333333",
        conversation_id: convId,
        uploader_id: userId,
        message_id: "44444444-4444-4444-4444-444444444444",
        storage_key: "attachments/conv/id/photo.jpg",
        original_filename: "photo.jpg",
        mime_type: "image/jpeg",
        file_size: 5000,
        status: "attached",
        created_at: new Date().toISOString(),
      };
      queryFn.mockResolvedValueOnce([mockRecord]); // get
      queryFn.mockResolvedValueOnce([{ ok: true }]); // member check

      const service = new AttachmentService(mockDb, userId);
      const res = await service.access(mockRecord.id);

      expect(res.url).toContain("X-Amz-Signature");
      expect(res.expires_in).toBe(300);
    });
  });

  describe("Sending with Attachments", () => {
    it("send throws ValidationError if both body and attachments are empty", async () => {
      const { mockDb, queryFn } = createMockDb();
      queryFn.mockResolvedValueOnce([{ ok: true }]); // member check
      const service = new AttachmentService(mockDb, userId);

      await expect(
        service.send({
          conversation_id: convId,
          body: "   ",
          attachment_ids: [],
        }),
      ).rejects.toThrow("A message needs text or an attachment");
    });

    it("send succeeds with empty body if attachment is present", async () => {
      const { mockDb, queryFn } = createMockDb();
      queryFn.mockResolvedValueOnce([{ ok: true }]); // member check
      const attId = "33333333-3333-3333-3333-333333333333";
      const mockAttachment = {
        id: attId,
        conversation_id: convId,
        uploader_id: userId,
        message_id: null,
        storage_key: "attachments/conv/333/photo.jpg",
        original_filename: "photo.jpg",
        mime_type: "image/jpeg",
        file_size: 5000,
        status: "uploaded",
        created_at: new Date().toISOString(),
      };
      queryFn.mockResolvedValueOnce([mockAttachment]); // fetch uploaded attachments
      const mockMsg = {
        id: "55555555-5555-5555-5555-555555555555",
        conversation_id: convId,
        sender_id: userId,
        body: "",
        client_id: null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        reply_to_id: null,
        forwarded_from_id: null,
      };
      queryFn.mockResolvedValueOnce([mockMsg]); // insert message
      queryFn.mockResolvedValueOnce([]); // update attachments status to attached

      const service = new AttachmentService(mockDb, userId);
      const msg = await service.send({
        conversation_id: convId,
        body: "",
        attachment_ids: [attId],
      });

      expect(msg.id).toBe(mockMsg.id);
      expect(msg.attachments).toHaveLength(1);
      expect(msg.attachments![0].id).toBe(attId);
    });
  });
});
