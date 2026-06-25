import { FileWithPath } from 'react-dropzone';

type FileWithPreview = FileWithPath & {
  preview?: string;
  url?: string;
  id?: string;
  size: number;
  type: string;
};

declare module 'react' {
  interface InputHTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export type { FileWithPreview };
