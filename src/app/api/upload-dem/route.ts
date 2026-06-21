import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { processUploadedDem } from '@/lib/rasterIngestion';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Retrieve chunk metadata sent by the resilient frontend component
    const chunk = formData.get('chunk') as Blob | null;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;
    const missionId = formData.get('missionId') as string;

    if (!chunk || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName || !missionId) {
      return NextResponse.json(
        { error: 'Missing required chunk metadata' },
        { status: 400 }
      );
    }

    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Temp file for assembling the chunks securely
    const tempFilePath = path.join(process.cwd(), 'tmp', `upload_${missionId}_${fileName}`);
    await fs.mkdir(path.dirname(tempFilePath), { recursive: true });

    // If it's the first chunk, overwrite any existing file to start fresh
    if (chunkIndex === 0) {
      await fs.writeFile(tempFilePath, buffer);
    } else {
      // Append subsequent chunks to the growing file
      await fs.appendFile(tempFilePath, buffer);
    }

    // Check if this is the final chunk that completes the file
    if (chunkIndex === totalChunks - 1) {
      const generationalNotes = formData.get('generationalNotes') as string || '';
      const plotName = formData.get('plotName') as string || `Plot_${missionId}`;

      console.log(`[API] Fully assembled file ${fileName}. Generating PostGIS database payload...`);
      
      if (generationalNotes) {
        console.log(`[Generational Knowledge Logged for ${plotName}]: ${generationalNotes}`);
        // TODO: In production, insert this into a dedicated 'field_notes' table
      }

      // Trigger the background rasterization pipeline
      const result = await processUploadedDem(tempFilePath, plotName);

      return NextResponse.json({ 
        success: true, 
        message: 'Upload complete and raster ingested successfully.',
        details: result
      });
    }

    // Acknowledge chunk receipt
    return NextResponse.json({ 
      success: true, 
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received successfully.` 
    });

  } catch (error: any) {
    console.error('[API] Chunk upload failure:', error);
    return NextResponse.json(
      { error: 'Failed to process chunk', details: error.message },
      { status: 500 }
    );
  }
}
