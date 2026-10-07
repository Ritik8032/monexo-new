const fs = require('fs');
const path = require('path');
const https = require('https');

const assets = [
  // ImageKit assets
  {
    urls: [
      "https://ik.imagekit.io/Monexo/edit.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/edit.png"
    ],
    filename: "edit.png"
  },
  {
    urls: [
      "https://ik.imagekit.io/Monexo/inrr.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/inrr.png"
    ],
    filename: "inrr.png"
  },
  {
    urls: [
      "https://ik.imagekit.io/Monexo/inpaying.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/inpaying.png"
    ],
    filename: "inpaying.png"
  },
  {
    urls: [
      "https://ik.imagekit.io/Monexo/assets.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/assets.png"
    ],
    filename: "assets.png"
  },
  {
    urls: [
      "https://ik.imagekit.io/Monexo/profit.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/profit.png"
    ],
    filename: "profit.png"
  },
  {
    urls: [
      "https://ik.imagekit.io/Monexo/video.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/video.png"
    ],
    filename: "video.png"
  },
  {
    urls: [
      "https://ik.imagekit.io/Monexo/telegram.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/telegram.png"
    ],
    filename: "telegram.png"
  },
  {
    urls: [
      "https://ik.imagekit.io/Monexo/buy_itoken.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/buy_itoken.png"
    ],
    filename: "buy_itoken.png"
  },
  {
    urls: [
      "https://ik.imagekit.io/Monexo/upi.png",
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/upi.png"
    ],
    filename: "upi.png"
  },

  // Supabase assets
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/airtel.jpg"
    ],
    filename: "airtel.jpg"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/amazon.png"
    ],
    filename: "amazon.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/bharatpe.png"
    ],
    filename: "bharatpe.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/esaf.png"
    ],
    filename: "esaf.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/freecharge.png"
    ],
    filename: "freecharge.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/IndusPay.png"
    ],
    filename: "IndusPay.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/iob.png"
    ],
    filename: "iob.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/jiof.jpg"
    ],
    filename: "jiof.jpg"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/mobikwik.png"
    ],
    filename: "mobikwik.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/navi.png"
    ],
    filename: "navi.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/paytm.png"
    ],
    filename: "paytm.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/paytm_business.png"
    ],
    filename: "paytm_business.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/phonepe.png"
    ],
    filename: "phonepe.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/phonepe_business.png"
    ],
    filename: "phonepe_business.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/slice.png"
    ],
    filename: "slice.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/utkarsh.jpg"
    ],
    filename: "utkarsh.jpg"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/avatar.png"
    ],
    filename: "avatar.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/Linkupi.png"
    ],
    filename: "Linkupi.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/UPItutorial.png"
    ],
    filename: "UPItutorial.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/i.png"
    ],
    filename: "i.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/teamlelve.png"
    ],
    filename: "teamlelve.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/phone.png"
    ],
    filename: "phone.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/password.png"
    ],
    filename: "password.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/gift.png"
    ],
    filename: "gift.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/batch.png"
    ],
    filename: "batch.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/deposithistory.png"
    ],
    filename: "deposithistory.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/service.png"
    ],
    filename: "service.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/copy.png"
    ],
    filename: "copy.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/teamCopy.png"
    ],
    filename: "teamCopy.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/register.png"
    ],
    filename: "register.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/file_00000000c3b871f8ac814a58eb9b5db3.png"
    ],
    filename: "Login_Logo.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/tokenbg.jpg"
    ],
    filename: "tokenbg.jpg"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/point_notline.png"
    ],
    filename: "point_notline.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/point_success.png"
    ],
    filename: "point_success.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/operateicon.png"
    ],
    filename: "operateicon.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/detailicon.png"
    ],
    filename: "detailicon.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/tether.jpg"
    ],
    filename: "tether.jpg"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/search.png"
    ],
    filename: "search.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/kyc.png"
    ],
    filename: "kyc.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/teamQR.png"
    ],
    filename: "teamQR.png"
  },
  {
    urls: [
      "https://slytlppadlmnnloszuwd.supabase.co/storage/v1/object/public/Png/noassets.png"
    ],
    filename: "noassets.png"
  }
];

function tryDownload(urls, index = 0) {
  if (index >= urls.length) {
    return Promise.resolve(null);
  }
  const url = urls[index];
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        resolve(tryDownload(urls, index + 1));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({ buffer: Buffer.concat(chunks), url });
      });
    }).on('error', () => {
      resolve(tryDownload(urls, index + 1));
    });
  });
}

async function run() {
  console.log("Downloading updated assets...");
  const dirs = [
    path.join(__dirname, 'static', 'icon'),
    path.join(__dirname, 'static', 'images'),
    path.join(__dirname, 'assets'),
    path.join(__dirname, 'public')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  for (const asset of assets) {
    const result = await tryDownload(asset.urls);
    if (result) {
      dirs.forEach((dir) => {
        const fullPath = path.join(dir, asset.filename);
        fs.writeFileSync(fullPath, result.buffer);
      });
      console.log(`[+] Saved ${asset.filename} across all dirs (Downloaded from ${result.url})`);
    } else {
      console.error(`[-] Failed to download any url for: ${asset.filename}`);
    }
  }
  console.log("Asset updates completed!");
}

run();
