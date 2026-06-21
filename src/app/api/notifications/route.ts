import { NextResponse } from 'next/server';

// In-memory store for prototyping Real-Time Advisories
// In production, this writes to and reads from the 'portal_notifications' PostgreSQL table via pg/Prisma
let mockNotifications: any[] = [];

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    mockNotifications.unshift({
      id: crypto.randomUUID(),
      ...payload,
      received_at: new Date().toISOString()
    });
    
    // Keep only the latest 10 to prevent memory leaks during prototype
    mockNotifications = mockNotifications.slice(0, 10);
    
    console.log("[Next.js Webhook] Received Advisory Alert:", payload.topic);
    return NextResponse.json({ success: true, count: mockNotifications.length });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to parse notification webhook' }, { status: 400 });
  }
}

export async function GET() {
  // Returns the latest active advisory notifications
  return NextResponse.json({ notifications: mockNotifications });
}
