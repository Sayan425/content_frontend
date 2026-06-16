import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/gsaya/OneDrive/Desktop/Content/frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVIVE_ROLE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const manifest = {
  "templateId": "TransparentTemplate",
  "videoUrl": "Shalini_Mishra_Videos/Ikea Effect/Avatar_Video.mp4",
  "subtitlesUrl": "Shalini_Mishra_Videos/Ikea Effect/subtitles.json",
  "backgroundMusicUrl": "assets/background_music/BGM_2.mp3",
  "subtitleStyle": "Sticker",
  "textOverlayStyle": "Glassmorphism",
  "overlays": [
    {
      "type": "Image",
      "startInSeconds": 0,
      "durationInSeconds": 5.6,
      "props": {
        "src": "Shalini_Mishra_Videos/Ikea Effect/images/ddg_people_working_together_assembling_wooden_furniture_inside_a_bright_studio_portrait.jpg"
      }
    },
    {
      "type": "TextOverlay",
      "startInSeconds": 0,
      "durationInSeconds": 4,
      "props": {
        "text": "UNPAID LABOUR?"
      }
    },
    {
      "type": "Image",
      "startInSeconds": 5.6,
      "durationInSeconds": 5.9,
      "props": {
        "src": "Shalini_Mishra_Videos/Ikea Effect/images/yahoo_large_modern_IKEA_store_exterior_with_bright_yellow_and_blue_sign_portrait.jpg"
      }
    }
  ]
};

async function insert() {
  const { data, error } = await supabase
    .from('edit_queue')
    .insert([
      {
        edit_id: '90321198-179a-4158-91d1-b6c4d609ae50',
        manifest: manifest,
        raw_video_link: "Shalini_Mishra_Videos/Ikea Effect/Avatar_Video.mp4",
      }
    ])
    .select();

  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

insert();
