import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3"
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the user with Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    // 2. Parse the request
    const { fileName, contentType, avatarName, type, customBucket, customPath, customPublicUrlBase } = await req.json()
    if (!fileName || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }

    // 3. Setup Cloudflare R2 Client using AWS SDK
    const accountId = Deno.env.get('R2_ACCOUNT_ID')
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const bucketName = customBucket || Deno.env.get('R2_BUCKET_NAME')
    const publicUrlBase = customPublicUrlBase || Deno.env.get('R2_PUBLIC_URL')

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrlBase) {
      return new Response(JSON.stringify({ error: 'Server missing R2 credentials' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // 4. Create secure path based on upload type
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    let path = '';

    if (customPath) {
      path = `${customPath}${safeFileName}`;
    } else if (type === 'bgm') {
      path = `editing-assets/bgm/${Date.now()}_${safeFileName}`;
    } else {
      if (!avatarName) {
         return new Response(JSON.stringify({ error: 'Missing avatarName for avatar upload' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
      }
      const safeAvatarName = avatarName.replace(/[^a-zA-Z0-9_-]/g, '_');
      path = `avatars/${user.id}/${safeAvatarName}/${Date.now()}_${safeFileName}`;
    }

    // 5. Generate Presigned URL
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: path,
      ContentType: contentType,
    });

    // URL is valid for 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // The final public URL the frontend will save to the database
    const publicUrl = `${publicUrlBase.replace(/\/$/, '')}/${path}`;

    return new Response(
      JSON.stringify({ signedUrl, publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
