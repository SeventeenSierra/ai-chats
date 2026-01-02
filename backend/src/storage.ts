// SPDX-License-Identifier: PolyForm-Strict-1.0.0
// SPDX-FileCopyrightText: 2025 Seventeen Sierra LLC

import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'

let _s3Client: S3Client | null = null

function getS3Client(): S3Client {
	if (!_s3Client) {
		if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
			throw new Error('S3_ACCESS_KEY or S3_SECRET_KEY is not defined in environment variables')
		}
		_s3Client = new S3Client({
			endpoint: process.env.S3_ENDPOINT_URL || 'http://localhost:3900',
			region: 'us-east-1',
			credentials: {
				accessKeyId: process.env.S3_ACCESS_KEY,
				secretAccessKey: process.env.S3_SECRET_KEY,
			},
			forcePathStyle: true,
		})
	}
	return _s3Client
}

function getBucketName(): string {
	return process.env.S3_BUCKET_NAME || 'conversations'
}

export async function uploadToStorage(key: string, content: string): Promise<void> {
	await getS3Client().send(
		new PutObjectCommand({
			Bucket: getBucketName(),
			Key: key,
			Body: content,
			ContentType: 'application/xml',
		}),
	)
}

export async function downloadFromStorage(key: string): Promise<string> {
	const response = await getS3Client().send(
		new GetObjectCommand({
			Bucket: getBucketName(),
			Key: key,
		}),
	)
	return (await response.Body?.transformToString()) || ''
}

export async function deleteFromStorage(key: string): Promise<void> {
	await getS3Client().send(
		new DeleteObjectCommand({
			Bucket: getBucketName(),
			Key: key,
		}),
	)
}

export async function listFromStorage(prefix: string): Promise<string[]> {
	const response = await getS3Client().send(
		new ListObjectsV2Command({
			Bucket: getBucketName(),
			Prefix: prefix,
		}),
	)
	return (response.Contents || []).map((item) => item.Key || '').filter(Boolean)
}

export { getS3Client as s3Client, getBucketName as BUCKET_NAME }
