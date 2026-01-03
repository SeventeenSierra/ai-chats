
const { S3Client, ListBucketsCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');

async function diag() {
    const s3 = new S3Client({
        endpoint: process.env.S3_ENDPOINT_URL || 'http://localhost:3900',
        region: 'us-east-1',
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY || 'GK880773596ef5e0d6584eed06',
            secretAccessKey: process.env.S3_SECRET_KEY || 'bb602b4493f70030c4e94aa69a7d27a8538c55313f6544435aa23823e44db19e',
        },
        forcePathStyle: true,
    });

    try {
        console.log('Listing buckets...');
        const data = await s3.send(new ListBucketsCommand({}));
        console.log('Buckets:', data.Buckets.map(b => b.Name));

        if (!data.Buckets.find(b => b.Name === 'conversations')) {
            console.log('Creating "conversations" bucket...');
            await s3.send(new CreateBucketCommand({ Bucket: 'conversations' }));
            console.log('Bucket created.');
        } else {
            console.log('"conversations" bucket already exists.');
        }
    } catch (err) {
        console.error('S3 Diagnostics Failed:', err);
    }
}

diag();
