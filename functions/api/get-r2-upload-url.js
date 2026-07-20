import { AwsClient } from 'aws4fetch';

const sanitizeR2Path = (p) => String(p)
  .split('/')
  .filter(seg => seg && seg !== '.' && seg !== '..')
  .map(seg => seg.replace(/[^a-zA-Z0-9 _.\-()%]/g, '_'))
  .join('/');

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { fileName, contentType, avatarName, userId, type, customBucket, customPath, customPublicUrlBase } = body;

    if (!fileName || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    let filePath = '';

    if (customPath) {
      const safePath = sanitizeR2Path(customPath);
      filePath = safePath ? `${safePath}/${safeFileName}` : safeFileName;
    } else if (type === 'bgm') {
      filePath = `editing-assets/bgm/${Date.now()}_${safeFileName}`;
    } else {
      if (!avatarName || !userId) {
        return new Response(JSON.stringify({ error: 'Missing avatarName or userId for avatar upload' }), { status: 400 });
      }
      const safeAvatarName = avatarName.replace(/[^a-zA-Z0-9_-]/g, '_');
      filePath = `${safeAvatarName}/${Date.now()}_${safeFileName}`;
    }

    const bucketName = customBucket || 'avatar-details';
    const endpointUrl = new URL(env.CLOUDFARE_ENDPOINT);
    const url = `${endpointUrl.origin}/${bucketName}/${filePath}`;

    const aws = new AwsClient({
      accessKeyId: env.CLOUDFARE_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFARE_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto'
    });

    const signedRequest = await aws.sign(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType
      },
      aws: { signQuery: true }
    });

    const signedUrl = signedRequest.url;
    const publicUrlBase = customPublicUrlBase || env.CLOUDFARE_PUBLIC_URL || 'https://avatars.youravatarstudio.com';
    const publicUrl = `${publicUrlBase.replace(/\/$/, '')}/${filePath}`;

    return new Response(JSON.stringify({ signedUrl, publicUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('R2 Plugin Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
