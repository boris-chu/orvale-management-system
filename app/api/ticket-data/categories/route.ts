import { NextRequest, NextResponse } from 'next/server';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get all active ticket categories
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

    // Get all active request types
    const requestTypes = await queryAsync(`
      SELECT 
        id,
        category_id,
        name,
        sort_order
      FROM request_types 
      WHERE active = TRUE 
      ORDER BY category_id ASC, sort_order ASC, name ASC
    `);

    // Get all active subcategories
    const subcategories = await queryAsync(`
      SELECT 
        id,
        request_type_id,
        name,
        sort_order
      FROM subcategories 
      WHERE active = TRUE 
      ORDER BY request_type_id ASC, sort_order ASC, name ASC
    `);

    // Convert to format expected by ticket system
    const categoryMap: { [key: string]: string } = {};
    categories.forEach(category => {
      categoryMap[category.id] = category.name;
    });

    // Group request types by category
    const requestTypeMap: { [key: string]: Array<{value: string, text: string}> } = {};
    requestTypes.forEach(requestType => {
      if (!requestTypeMap[requestType.category_id]) {
        requestTypeMap[requestType.category_id] = [];
      }
      requestTypeMap[requestType.category_id].push({
        value: requestType.id,
        text: requestType.name
      });
    });

    // Group subcategories by request type
    const subcategoryMap: { [key: string]: { [key: string]: Array<{value: string, text: string}> } } = {};
    subcategories.forEach(subcategory => {
      // Find which category this request type belongs to
      const requestType = requestTypes.find(rt => rt.id === subcategory.request_type_id);
      if (requestType) {
        const categoryId = requestType.category_id;
        const requestTypeId = requestType.id;
        
        if (!subcategoryMap[categoryId]) {
          subcategoryMap[categoryId] = {};
        }
        if (!subcategoryMap[categoryId][requestTypeId]) {
          subcategoryMap[categoryId][requestTypeId] = [];
        }
        subcategoryMap[categoryId][requestTypeId].push({
          value: subcategory.id,
          text: subcategory.name
        });
      }
    });

    return NextResponse.json({
      categories: categoryMap,
      requestTypes: requestTypeMap,
      subcategories: subcategoryMap
    });

  } catch (error) {
    console.error('Error fetching ticket categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}