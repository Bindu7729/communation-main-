import { describe, it, expect } from 'vitest';
import { validateAttachmentUpload } from '../../src/lib/fileSizeGuard';

describe('Attachment File Size and MIME Guard', () => {
  it('permits compliant media payloads', () => {
    const res = validateAttachmentUpload(1024 * 500, 'image/png');
    expect(res.valid).toBe(true);
  });

  it('rejects oversized files exceeding threshold', () => {
    const res = validateAttachmentUpload(30 * 1024 * 1024, 'application/pdf');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('File size exceeds');
  });

  it('rejects forbidden executable MIME formats', () => {
    const res = validateAttachmentUpload(1024, 'application/x-msdownload');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Unsupported media type');
  });
});
