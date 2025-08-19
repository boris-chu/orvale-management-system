import { NextRequest, NextResponse } from 'next/server';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get all DPSS organizational data for dropdown use
    const [offices, bureaus, divisions, sections] = await Promise.all([
      queryAsync(`
        SELECT id, name, sort_order 
        FROM dpss_offices 
        WHERE active = TRUE 
        ORDER BY sort_order ASC, name ASC
      `),
      queryAsync(`
        SELECT id, name, sort_order 
        FROM dpss_bureaus 
        WHERE active = TRUE 
        ORDER BY sort_order ASC, name ASC
      `),
      queryAsync(`
        SELECT id, name, sort_order 
        FROM dpss_divisions 
        WHERE active = TRUE 
        ORDER BY sort_order ASC, name ASC
      `),
      queryAsync(`
        SELECT id, name, sort_order 
        FROM dpss_sections 
        WHERE active = TRUE 
        ORDER BY sort_order ASC, name ASC
      `)
    ]);

    // Convert to arrays for dropdown use
    const organizationalData = {
      offices: offices.map(office => office.name),
      bureaus: bureaus.map(bureau => bureau.name),
      divisions: divisions.map(division => division.name),
      sections: sections.map(section => section.name)
    };

    return NextResponse.json(organizationalData);

  } catch (error) {
    console.error('Error fetching organizational data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}