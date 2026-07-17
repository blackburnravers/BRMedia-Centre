export type DriveAccountId = string;

export interface DriveAccount {
  id: DriveAccountId;
  label: string; // your “sub-name” label
  email?: string;
}

export interface DriveFileRef {
  id: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface DriveClient {
  listFiles(opts: { accountId: DriveAccountId; folderId?: string }): Promise<DriveFileRef[]>;
  getDownloadUrl(opts: { accountId: DriveAccountId; fileId: string }): Promise<string>;
}

/**
 * Placeholder – real Drive auth + API wiring later.
 */
export const NoopDriveClient: DriveClient = {
  async listFiles() {
    return [];
  },
  async getDownloadUrl() {
    return "";
  },
};