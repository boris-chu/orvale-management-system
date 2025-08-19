import { NextRequest, NextResponse } from 'next/server';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get all active ticket categories for dropdown use
    const categories = await queryAsync(`
      SELECT 
        id,
        name,
        description,
        sort_order
      FROM ticket_categories 
      WHERE active = TRUE 
      ORDER BY sort_order ASC, name ASC
    `);

    // Convert to format expected by ticket system
    const categoryMap: { [key: string]: string } = {};
    categories.forEach(category => {
      categoryMap[category.id] = category.name;
    });

    return NextResponse.json(categoryMap);

  } catch (error) {
    console.error('Error fetching ticket categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}