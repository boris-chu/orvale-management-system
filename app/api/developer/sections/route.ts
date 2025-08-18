import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get sections with parent information and team counts
    const sections = await queryAsync(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.parent_section_id,
        ps.name as parent_section_name,
        s.active,
        s.created_at,
        s.updated_at,
        (SELECT COUNT(*) FROM teams WHERE section_id = s.id AND active = TRUE) as team_count
      FROM sections s
      LEFT JOIN sections ps ON s.parent_section_id = ps.id
      WHERE s.active = TRUE
      ORDER BY s.parent_section_id IS NULL DESC, s.name
    `);

    return NextResponse.json(sections);

  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}