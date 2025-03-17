import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    return key;
  }

  async getPresignedUrl(key: string): Promise<string> {
    const bucketName = this.bucketName;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    // Generate a pre-signed URL that expires in 2 hour
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 * 2 });
  }

  /**
   * Generates a public URL for an S3 object
   * @param key The S3 key of the object
   * @returns The public URL of the object
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Downloads an image from an external URL and uploads it to S3
   * @param imageUrl The external URL of the image
   * @param folderPath Optional folder path within the bucket
   * @returns The S3 key of the uploaded image
   */
  async transferImageFromUrl(
    imageUrl: string,
    folderPath = 'word-illustrations',
  ): Promise<string> {
    try {
      // 1. Download the image from the external URL
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });

      // Determine content type from response or default to image/png
      const contentType = response.headers['content-type'] || 'image/png';

      // 2. Generate a unique key for the S3 object
      const fileExtension = this.getFileExtension(imageUrl);
      const s3Key = `${folderPath}/${uuidv4()}${fileExtension}`;

      // 3. Upload to S3
      const buffer = Buffer.from(response.data);
      const uploadedKey = await this.uploadFile(buffer, s3Key, contentType);

      return uploadedKey;
    } catch (error) {
      console.error('Error transferring image to S3:', error);
      throw new Error('Failed to transfer image to S3');
    }
  }

  /**
   * Downloads an image from an external URL and uploads it to S3 for a specific word
   * @param wordId The ID of the word
   * @param imageUrl The external URL of the image
   * @returns The public URL of the uploaded image
   */
  async transferWordIllustration(
    wordId: number,
    imageUrl: string,
  ): Promise<string> {
    const folderPath = `word-illustrations/${wordId}`;
    const s3Key = await this.transferImageFromUrl(imageUrl, folderPath);
    return this.getPublicUrl(s3Key);
  }

  /**
   * Helper method to extract file extension from URL
   * @param url URL to extract extension from
   * @returns File extension with dot, or .png as default
   */
  private getFileExtension(url: string): string {
    const match = url.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i);
    return match ? `.${match[1].toLowerCase()}` : '.png'; // Default to .png if no extension found
  }
}
