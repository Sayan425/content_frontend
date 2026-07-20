import { AwsClient } from 'aws4fetch';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { publicUrl, customBucket } = body;
    
    if (!publicUrl) {
      return new Response(JSON.stringify({ error: 'Missing publicUrl' }), { status: 400 });
    }

    // The object key is the URL path without the leading slash.
    const key = decodeURIComponent(new URL(publicUrl).pathname.replace(/^\//, ''));
    if (!key) {
      return new Response(JSON.stringify({ error: 'Could not derive object key from URL' }), { status: 400 });
    }

    const ALLOWED_BUCKETS = ['video-folder', 'avatar-details'];
    const bucketName = customBucket || 'video-folder';
    if (!ALLOWED_BUCKETS.includes(bucketName)) {
      return new Response(JSON.stringify({ error: 'Bucket not allowed' }), { status: 400 });
    }
    const endpointUrl = new URL(env.CLOUDFARE_ENDPOINT);
    const url = `${endpointUrl.origin}/${bucketName}/${key}`;

    const aws = new AwsClient({
      accessKeyId: env.CLOUDFARE_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFARE_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto'
    });

    const res = await aws.fetch(url, { method: 'DELETE' });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`S3 Delete failed: ${res.status} ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true, deletedKey: key }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('R2 delete error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
