import { FileWithPath } from 'react-dropzone';

export interface UploadProgressEvent extends ProgressEvent {
  loaded: number;
  total: number;
  lengthComputable: boolean;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface FileUploadResponse {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  key: string;
  bucket: string;
  region: string;
  etag: string;
  versionId?: string;
  expires?: string;
}

export interface FileUploadOptions {
  onProgress?: UploadProgressCallback;
  signal?: AbortSignal;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
}

export type FileWithPreview = FileWithPath & {
  preview?: string;
  url?: string;
  id?: string;
  size: number;
  type: string;
};
