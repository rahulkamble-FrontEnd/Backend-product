import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION') ?? 'ap-south-1';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') ?? '';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  /**
   * Uploads a file buffer to S3 and returns the S3 object key.
   *
   * @param key    - The S3 object key (path inside the bucket), e.g. "products/uuid/filename.jpg"
   * @param body   - The file buffer
   * @param mimeType - MIME type of the uploaded file
   */
  async uploadFile(
    key: string,
    body: Buffer,
    mimeType: string,
  ): Promise<string> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      return key;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown S3 error';
      throw new InternalServerErrorException(
        `Failed to upload file to S3: ${message}`,
      );
    }
  }

  /**
   * Returns the public URL for an S3 object key.
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    const params: DeleteObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
    };

    try {
      await this.s3Client.send(new DeleteObjectCommand(params));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown S3 error';
      throw new InternalServerErrorException(
        `Failed to delete file from S3: ${message}`,
      );
    }
  }
}
