import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const customDir = path.join(process.cwd(), 'public', 'avatars', 'custom');
    
    // Check if directory exists
    if (!fs.existsSync(customDir)) {
      return NextResponse.json({ avatars: [] });
    }

    // Read directory
    const files = fs.readdirSync(customDir);
    
    // Filter only images
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
    const avatars = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => `/avatars/custom/${file}`);

    return NextResponse.json({ avatars });
  } catch (error) {
    console.error("Failed to read custom avatars:", error);
    return NextResponse.json({ avatars: [] }, { status: 500 });
  }
}
