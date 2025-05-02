// Flexible query builder tool for the ReactAgentService
import { db } from "../../db";
import { 
  patients, caregivers, goals, subgoals, 
  sessions, sessionNotes, strategies, 
  goalAssessments, milestoneAssessments,
  budgetSettings, budgetItems
} from "../../../shared/schema";
import { and, asc, desc, eq, gt, gte, inArray, like, lt, lte, ne, not, or, sql } from 'drizzle-orm';

/**
 * Builds and executes a flexible database query with optional joins
 * @param input Format: 'tableName,fields,conditions,limit,joinTable,joinCondition'
 * @returns The query results as a formatted string
 */
export async function flexibleQueryBuilder(input: string): Promise<string> {
  try {
    // Parse the input
    const parts = input.split(',');
    
    if (parts.length < 3) {
      return "Error: Input must contain at least tableName, fields, and conditions. Format: 'tableName,fields,conditions,limit,joinTable,joinCondition'";
    }
    
    const tableName = parts[0].trim();
    const fields = parts[1].trim().split('|');
    const conditions = parts[2].trim();
    const limit = parts.length > 3 ? parseInt(parts[3].trim()) : 10;
    const joinTable = parts.length > 4 ? parts[4].trim() : null;
    const joinCondition = parts.length > 5 ? parts[5].trim() : null;
    
    // Validate table name
    const tableMap: { [key: string]: any } = {
      'patients': patients,
      'caregivers': caregivers,
      'goals': goals,
      'subgoals': subgoals,
      'sessions': sessions,
      'sessionNotes': sessionNotes,
      'strategies': strategies,
      'goalAssessments': goalAssessments,
      'milestoneAssessments': milestoneAssessments,
      'budgetSettings': budgetSettings,
      'budgetItems': budgetItems
    };
    
    if (!tableMap[tableName]) {
      return `Error: Table '${tableName}' not found. Available tables: ${Object.keys(tableMap).join(', ')}`;
    }
    
    const table = tableMap[tableName];
    
    // Validate fields
    const validFields = Object.keys(table);
    const invalidFields = fields.filter(field => !validFields.includes(field));
    
    if (invalidFields.length > 0) {
      return `Error: Invalid fields for table '${tableName}': ${invalidFields.join(', ')}. Available fields: ${validFields.join(', ')}`;
    }
    
    // Build the query
    let query = db.select();
    
    // Add selected fields
    if (fields[0] === '*') {
      query = query.from(table);
    } else {
      // Map field names to table columns
      const selectedFields = fields.map(field => table[field]);
      query = query.from(table).select(selectedFields);
    }
    
    // Parse and add conditions
    if (conditions && conditions !== 'none') {
      try {
        const conditionParts = conditions.split(' AND ');
        
        for (const condition of conditionParts) {
          const match = condition.match(/([a-zA-Z0-9_]+)\s*([=><]|LIKE|IN)\s*(.*)/);
          
          if (match) {
            const [_, fieldName, operator, value] = match;
            
            if (!table[fieldName]) {
              return `Error: Field '${fieldName}' not found in table '${tableName}'. Available fields: ${validFields.join(', ')}`;
            }
            
            switch (operator) {
              case '=':
                query = query.where(eq(table[fieldName], value.replace(/['"]/g, '')));
                break;
              case '>':
                query = query.where(gt(table[fieldName], value.replace(/['"]/g, '')));
                break;
              case '<':
                query = query.where(lt(table[fieldName], value.replace(/['"]/g, '')));
                break;
              case 'LIKE':
                query = query.where(like(table[fieldName], value.replace(/['"]/g, '')));
                break;
              case 'IN':
                const values = value.replace(/[()]/g, '').split(',').map(v => v.trim().replace(/['"]/g, ''));
                query = query.where(inArray(table[fieldName], values));
                break;
              default:
                return `Error: Unsupported operator '${operator}'. Supported operators: =, >, <, LIKE, IN`;
            }
          } else {
            return `Error: Invalid condition format '${condition}'. Format should be 'fieldName operator value'`;
          }
        }
      } catch (error) {
        console.error("Error parsing conditions:", error);
        return `Error parsing conditions: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    // Add join if specified
    if (joinTable && joinCondition) {
      if (!tableMap[joinTable]) {
        return `Error: Join table '${joinTable}' not found. Available tables: ${Object.keys(tableMap).join(', ')}`;
      }
      
      const joinTableObj = tableMap[joinTable];
      
      try {
        const joinMatch = joinCondition.match(/([a-zA-Z0-9_]+)=([a-zA-Z0-9_]+)/);
        
        if (joinMatch) {
          const [_, joinField, tableField] = joinMatch;
          
          if (!joinTableObj[joinField]) {
            return `Error: Join field '${joinField}' not found in table '${joinTable}'`;
          }
          
          if (!table[tableField]) {
            return `Error: Table field '${tableField}' not found in table '${tableName}'`;
          }
          
          query = query.innerJoin(joinTableObj, eq(joinTableObj[joinField], table[tableField]));
        } else {
          return `Error: Invalid join condition format '${joinCondition}'. Format should be 'joinField=tableField'`;
        }
      } catch (error) {
        console.error("Error setting up join:", error);
        return `Error setting up join: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    
    // Add limit
    query = query.limit(limit);
    
    // Execute the query
    const results = await query.execute();
    
    // Format the results
    if (results.length === 0) {
      return `No results found for the query on table '${tableName}'${joinTable ? ` with join to '${joinTable}'` : ''}.`;
    }
    
    // Simplified response format for better agent processing
    const formattedResults = results.map((result, index) => {
      const formattedResult: { [key: string]: any } = {};
      
      // Only include the requested fields
      if (fields[0] === '*') {
        return result;
      } else {
        fields.forEach(field => {
          formattedResult[field] = result[field];
        });
      }
      
      return formattedResult;
    });
    
    // Return a more concise summary for better agent processing
    const count = formattedResults.length;
    const summary = `Found ${count} ${count === 1 ? 'result' : 'results'} for the query on table '${tableName}'${joinTable ? ` with join to '${joinTable}'` : ''}.`;
    
    // For a small number of results, show all details
    if (count <= 5) {
      return `${summary}\n\n${JSON.stringify(formattedResults, null, 2)}`;
    }
    
    // For larger result sets, show a summary and the first few items
    return `${summary}\n\nShowing first 5 results:\n\n${JSON.stringify(formattedResults.slice(0, 5), null, 2)}`;
    
  } catch (error) {
    console.error("Error in flexible query builder:", error);
    return `Error executing query: ${error instanceof Error ? error.message : String(error)}`;
  }
}
