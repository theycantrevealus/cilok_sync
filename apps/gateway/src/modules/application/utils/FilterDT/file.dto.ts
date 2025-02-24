export interface LocalFileDto {
  originalname:string;
  filename: string;
  path: string;
  mimetype: string;
  buffer: Buffer;
  data?: any;
}
