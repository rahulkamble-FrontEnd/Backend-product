import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Test/staging bucket (Singapore). Prod bucket stays in ap-south-1. */
const TEST_S3_BUCKET = 'test-products-customfurnish';
const TEST_S3_REGION = 'ap-southeast-1';
const PROD_S3_REGION = 'ap-south-1';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') ?? '';
    const configuredRegion = this.configService.get<string>('AWS_REGION');

    // Test bucket must use ap-southeast-1; wrong region causes "specified endpoint" S3 errors.
    if (this.bucket === TEST_S3_BUCKET) {
      this.region = TEST_S3_REGION;
    } else {
      this.region = configuredRegion ?? PROD_S3_REGION;
    }

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

  /**
   * Returns a time-limited signed URL for private bucket object access.
   */
  async getSignedObjectUrl(
    key: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown S3 signing error';
      throw new InternalServerErrorException(
        `Failed to generate signed URL: ${message}`,
      );
    }
  }
}
